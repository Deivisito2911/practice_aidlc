import { randomUUID } from 'node:crypto';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { createInterface } from 'node:readline/promises';

type Action = 'preview' | 'execute' | 'backfill';
interface OperationResponse {
  statusCode?: number;
  status: string;
  scope?: string;
  ids?: string[];
  count?: number;
  limit?: number;
  fingerprint?: string;
  confirmed?: number;
  failed?: number;
  pending?: number;
  scanned?: number;
  updated?: number;
  cursor?: Record<string, unknown>;
  correlationId?: string;
}

export async function invokeOperator(
  functionArn: string,
  payload: Record<string, unknown>,
  client = new LambdaClient({}),
): Promise<OperationResponse> {
  const response = await client.send(
    new InvokeCommand({
      FunctionName: functionArn,
      InvocationType: 'RequestResponse',
      Payload: Buffer.from(JSON.stringify(payload)),
    }),
  );
  if (response.FunctionError)
    throw new Error('Lambda operation failed; inspect correlated service logs.');
  if (!response.Payload) throw new Error('Lambda returned no operation result.');
  const result = JSON.parse(Buffer.from(response.Payload).toString('utf8')) as OperationResponse;
  if (result.statusCode && result.statusCode >= 400)
    throw new Error('Lambda rejected the operation.');
  return result;
}

export async function runOperatorCli(argv = process.argv.slice(2)): Promise<void> {
  const [actionArg, ...args] = argv;
  if (!['preview', 'execute', 'backfill'].includes(actionArg ?? '')) {
    throw new Error('Usage: telemetry-operations <preview|execute|backfill> [--limit 1..25]');
  }
  const action = actionArg as Action;
  const functionArn = process.env.TELEMETRY_FUNCTION_ARN;
  if (!functionArn)
    throw new Error('Set TELEMETRY_FUNCTION_ARN to the existing TelemetryService ARN.');
  const limit = numberOption(args, '--limit', 25);
  const base = { operation: 'manual-recovery', limit, correlationId: randomUUID() };
  if (action === 'preview') {
    const result = await invokeOperator(functionArn, { ...base, action });
    renderPreview(result);
    return;
  }
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    if (action === 'execute') {
      const preview = await invokeOperator(functionArn, { ...base, action: 'preview' });
      renderPreview(preview);
      if (!preview.count || !preview.fingerprint) {
        console.log('No eligible outputs. Nothing changed.');
        return;
      }
      const answer = await terminal.question(
        `Type EXECUTE ${preview.fingerprint} to confirm this exact set: `,
      );
      if (answer !== `EXECUTE ${preview.fingerprint}`)
        throw new Error('Confirmation did not match; nothing was executed.');
      const result = await invokeOperator(functionArn, {
        ...base,
        action,
        fingerprint: preview.fingerprint,
        confirmation: preview.fingerprint,
      });
      console.log(JSON.stringify(result, null, 2));
      return;
    }
    const answer = await terminal.question(
      'Backfill writes missing deterministic TTL shards in batches of 25. Type BACKFILL to continue: ',
    );
    if (answer !== 'BACKFILL') throw new Error('Confirmation did not match; no backfill was run.');
    let cursor: Record<string, unknown> | undefined;
    do {
      const result = await invokeOperator(functionArn, { ...base, action, cursor });
      console.log(
        JSON.stringify({
          status: result.status,
          scanned: result.scanned,
          updated: result.updated,
          hasMore: Boolean(result.cursor),
          correlationId: result.correlationId,
        }),
      );
      cursor = result.cursor;
    } while (cursor);
  } finally {
    terminal.close();
  }
}

function numberOption(args: string[], name: string, fallback: number): number {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(args[index + 1]);
  if (!Number.isInteger(value) || value < 1 || value > 25)
    throw new Error(`${name} must be between 1 and 25.`);
  return value;
}

function renderPreview(preview: OperationResponse): void {
  console.log(
    JSON.stringify(
      {
        scope: preview.scope,
        ids: preview.ids,
        count: preview.count,
        limit: preview.limit,
        fingerprint: preview.fingerprint,
        correlationId: preview.correlationId,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1]?.endsWith('telemetry-operations.ts')) {
  runOperatorCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Operation failed.');
    process.exitCode = 1;
  });
}
