import { describe, expect, it, vi } from 'vitest';
import { runOperatorCli, invokeOperator } from '../../bin/telemetry-operations.js';
import type { PreviewEnvelope } from './recovery-preview.js';
describe('CLI consentimiento y frontera Invoke', () => {
  it('RequestResponse conserva ID API distinto del ID Lambda', async () => {
    const send = vi.fn(async (command: { input: { InvocationType?: string } }) => {
      expect(command.input.InvocationType).toBe('RequestResponse');
      return {
        Payload: Buffer.from(
          JSON.stringify({ status: 'complete', invocationRequestId: 'lambda-id' }),
        ),
        $metadata: { requestId: 'api-id' },
      };
    });
    expect(await invokeOperator('arn', {}, { send } as never)).toMatchObject({
      invocationRequestId: 'lambda-id',
      invokeRequestId: 'api-id',
    });
    expect(send.mock.calls[0][0].input.InvocationType).toBe('RequestResponse');
  });
  it('confirmación reenvía envelope intacto y nunca imprime MAC', async () => {
    const envelope = { digest: 'digest', mac: 'hidden' } as PreviewEnvelope;
    const invoke = vi
      .fn()
      .mockResolvedValueOnce({
        status: 'preview',
        count: 1,
        ids: ['LOW_BATTERY:a'],
        limit: 25,
        issuedAt: 1,
        expiresAt: 301,
        fingerprint: 'digest',
        envelope,
      })
      .mockResolvedValueOnce({ status: 'partial', unprocessed: 1 });
    const log = vi.fn();
    await runOperatorCli(['execute'], {
      functionArn: 'arn',
      invoke,
      question: async () => 'EXECUTE digest',
      log,
    });
    expect(invoke.mock.calls[1][1]).toMatchObject({ preview: envelope, confirmation: 'digest' });
    expect(JSON.stringify(log.mock.calls)).not.toContain('hidden');
  });
  it('denegación Invoke, fallo Lambda o confirmación incorrecta no hacen ejecución posterior', async () => {
    const invoke = vi
      .fn()
      .mockRejectedValue(
        Object.assign(new Error('AccessDenied'), { name: 'AccessDeniedException' }),
      );
    await expect(
      runOperatorCli(['execute'], { functionArn: 'arn', invoke, question: async () => '' }),
    ).rejects.toThrow('AccessDenied');
    expect(invoke).toHaveBeenCalledOnce();
    const preview = vi
      .fn()
      .mockResolvedValue({ status: 'preview', count: 1, fingerprint: 'digest', envelope: {} });
    await expect(
      runOperatorCli(['execute'], {
        functionArn: 'arn',
        invoke: preview,
        question: async () => 'yes',
        log: vi.fn(),
      }),
    ).rejects.toThrow('Confirmación');
    expect(preview).toHaveBeenCalledOnce();
    await expect(
      invokeOperator('arn', {}, {
        send: vi.fn(async () => ({ FunctionError: 'Unhandled' })),
      } as never),
    ).rejects.toThrow('falló');
  });
});
