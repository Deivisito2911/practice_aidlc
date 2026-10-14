import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  issuePreview,
  verifyPreview,
  previewDigest,
  KmsMac,
  type MacPort,
} from './recovery-preview.js';

const now = new Date('2026-01-01T00:00:00Z');
const mac: MacPort = {
  generate: async (digest) =>
    createHmac('sha256', 'synthetic-test-key').update(digest).digest('base64'),
  verify: async (digest, _keyId, signature) => signature === (await mac.generate(digest, 'test')),
};
const options = {
  mac,
  keyId: 'test',
  allowedKeyIds: ['test'],
  clock: () => now,
  uuid: () => 'preview-1',
};
describe('preview autenticada', () => {
  it('ordena IDs únicos y autentica los campos originales mediante digest de 32 bytes', async () => {
    const preview = await issuePreview(
      ['LOW_BATTERY:b', 'LOW_BATTERY:a', 'LOW_BATTERY:a'],
      25,
      options,
    );
    expect(preview.ids).toEqual(['LOW_BATTERY:a', 'LOW_BATTERY:b']);
    expect(preview.expiresAt - preview.issuedAt).toBe(300);
    await expect(verifyPreview(preview, options)).resolves.toBeUndefined();
  });
  it.each([
    'version',
    'previewId',
    'scope',
    'ids',
    'limit',
    'issuedAt',
    'expiresAt',
    'keyId',
    'digest',
    'mac',
  ])('rechaza campo %s alterado', async (field) => {
    const preview = await issuePreview(['LOW_BATTERY:a'], 25, options);
    const changes: Record<string, unknown> = {
      version: 2,
      previewId: 'changed',
      scope: 'all',
      ids: ['LOW_BATTERY:b'],
      limit: 24,
      issuedAt: preview.issuedAt - 1,
      expiresAt: preview.expiresAt + 1,
      keyId: 'other',
      digest: '0'.repeat(64),
      mac: 'AAAA',
    };
    await expect(verifyPreview({ ...preview, [field]: changes[field] }, options)).rejects.toThrow();
  });
  it.each([300, 301])('rechaza a %s segundos, incluido vencimiento exacto', async (seconds) => {
    const preview = await issuePreview(['LOW_BATTERY:a'], 25, options);
    await expect(
      verifyPreview(preview, { ...options, clock: () => new Date(now.getTime() + seconds * 1000) }),
    ).rejects.toThrow('EXPIRED');
  });
  it('rechaza tiempos renovados aunque el cliente recalcule digest', async () => {
    const preview = await issuePreview(['LOW_BATTERY:a'], 25, options);
    const altered = {
      ...preview,
      issuedAt: preview.issuedAt - 1,
      expiresAt: preview.expiresAt - 1,
    };
    altered.digest = previewDigest(altered);
    await expect(verifyPreview(altered, options)).rejects.toThrow('MAC');
  });
  it.each([NaN, Infinity, 0, 26, 1.5])('rechaza límite %s', async (limit) => {
    await expect(issuePreview(['LOW_BATTERY:a'], limit, options)).rejects.toThrow();
  });
  it('propaga fallo KMS y no acepta MAC sin confirmar', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ Mac: new Uint8Array(32) })
      .mockResolvedValueOnce({ MacValid: false })
      .mockRejectedValueOnce(new Error('KMS unavailable'));
    const adapter = new KmsMac({ send } as never);
    expect(await adapter.generate(new Uint8Array(32), 'test')).toBe(
      Buffer.alloc(32).toString('base64'),
    );
    expect(send.mock.calls[0][0].input).toMatchObject({
      KeyId: 'test',
      MacAlgorithm: 'HMAC_SHA_256',
    });
    expect(send.mock.calls[0][0].input.Message).toHaveLength(32);
    expect(await adapter.verify(new Uint8Array(32), 'test', 'AQ==')).toBe(false);
    await expect(adapter.generate(new Uint8Array(32), 'test')).rejects.toThrow('KMS unavailable');
  });
});

it.each(['', 'AAAA', 'A'.repeat(5000), '!'.repeat(44)])(
  'MAC malformado no llama KMS verify',
  async (signature) => {
    const preview = await issuePreview(['LOW_BATTERY:a'], 25, options);
    const verify = vi.fn();
    await expect(
      verifyPreview({ ...preview, mac: signature }, { ...options, mac: { ...mac, verify } }),
    ).rejects.toThrow('MAC');
    expect(verify).not.toHaveBeenCalled();
  },
);
