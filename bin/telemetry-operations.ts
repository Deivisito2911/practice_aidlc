import { randomUUID } from 'node:crypto';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { createInterface } from 'node:readline/promises';
import type { PreviewEnvelope } from '../src/telemetry/recovery-preview.js';
export interface OperationResponse {
  statusCode?: number;
  status: string;
  scope?: string;
  ids?: string[];
  count?: number;
  limit?: number;
  issuedAt?: number;
  expiresAt?: number;
  fingerprint?: string;
  envelope?: PreviewEnvelope;
  cursor?: Record<string, unknown>;
  invocationRequestId?: string;
  invokeRequestId?: string;
  [key: string]: unknown;
}
export async function invokeOperator(
  functionArn: string,
  payload: Record<string, unknown>,
  client: Pick<LambdaClient, 'send'> = new LambdaClient({}),
): Promise<OperationResponse> {
  const response = await client.send(
    new InvokeCommand({
      FunctionName: functionArn,
      InvocationType: 'RequestResponse',
      Payload: Buffer.from(JSON.stringify(payload)),
    }),
  );
  if (response.FunctionError)
    throw new Error('La operación Lambda falló; consulte los logs correlacionados.');
  if (!response.Payload) throw new Error('Lambda no devolvió resultado.');
  const result = JSON.parse(Buffer.from(response.Payload).toString('utf8')) as OperationResponse;
  if (result.statusCode && result.statusCode >= 400)
    throw new Error('Lambda rechazó la operación.');
  return { ...result, invokeRequestId: response.$metadata?.requestId };
}
interface CliPorts {
  functionArn?: string;
  invoke?: (arn: string, payload: Record<string, unknown>) => Promise<OperationResponse>;
  question?: (prompt: string) => Promise<string>;
  log?: (message: string) => void;
  uuid?: () => string;
}
export async function runOperatorCli(
  argv = process.argv.slice(2),
  ports: CliPorts = {},
): Promise<void> {
  const [action, ...args] = argv;
  if (!['preview', 'execute', 'backfill'].includes(action ?? ''))
    throw new Error('Uso: telemetry-operations <preview|execute|backfill> [--limit 1..25]');
  if (args.length && (args.length !== 2 || args[0] !== '--limit'))
    throw new Error('Argumentos desconocidos o repetidos.');
  const limit = args.length ? Number(args[1]) : 25;
  if (!Number.isInteger(limit) || limit < 1 || limit > 25)
    throw new Error('El límite debe estar entre 1 y 25.');
  const arn = ports.functionArn ?? process.env.TELEMETRY_FUNCTION_ARN;
  if (!arn) throw new Error('Configure TELEMETRY_FUNCTION_ARN.');
  const invoke = ports.invoke ?? invokeOperator,
    log = ports.log ?? console.log;
  const base = { operation: 'manual-recovery', correlationId: ports.uuid?.() ?? randomUUID() };
  const render = (result: OperationResponse) => {
    const {
      scope,
      ids,
      count,
      limit,
      issuedAt,
      expiresAt,
      fingerprint,
      invocationRequestId,
      invokeRequestId,
    } = result;
    log(
      JSON.stringify(
        {
          scope,
          ids,
          count,
          limit,
          issuedAt,
          expiresAt,
          fingerprint,
          invocationRequestId,
          invokeRequestId,
        },
        null,
        2,
      ),
    );
  };
  if (action === 'preview') {
    render(await invoke(arn, { ...base, action, limit }));
    return;
  }
  const terminal = ports.question
    ? undefined
    : createInterface({ input: process.stdin, output: process.stdout });
  const question = ports.question ?? ((prompt: string) => terminal!.question(prompt));
  try {
    if (action === 'execute') {
      const preview = await invoke(arn, { ...base, action: 'preview', limit });
      render(preview);
      if (!preview.count || !preview.envelope) {
        log('No hay salidas elegibles.');
        return;
      }
      if (
        (await question(
          `Escriba EXECUTE ${preview.fingerprint} para confirmar el conjunto vigente: `,
        )) !== `EXECUTE ${preview.fingerprint}`
      )
        throw new Error('Confirmación inválida; no se ejecutó.');
      const result = await invoke(arn, {
        ...base,
        action,
        preview: preview.envelope,
        confirmation: preview.fingerprint,
      });
      log(JSON.stringify(result, null, 2));
      return;
    }
    if ((await question('Escriba BACKFILL para completar shards TTL por lotes: ')) !== 'BACKFILL')
      throw new Error('Confirmación inválida; no se ejecutó backfill.');
    let cursor: Record<string, unknown> | undefined;
    do {
      const result = await invoke(arn, {
        ...base,
        action,
        confirmation: 'BACKFILL',
        ...(cursor ? { cursor } : {}),
      });
      const { status, scanned, updated, invocationRequestId, invokeRequestId } = result;
      log(
        JSON.stringify({
          status,
          scanned,
          updated,
          hasMore: Boolean(result.cursor),
          invocationRequestId,
          invokeRequestId,
        }),
      );
      cursor = result.cursor;
    } while (cursor);
  } finally {
    terminal?.close();
  }
}
if (process.argv[1]?.endsWith('telemetry-operations.ts'))
  runOperatorCli().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Operación fallida.');
    process.exitCode = 1;
  });
