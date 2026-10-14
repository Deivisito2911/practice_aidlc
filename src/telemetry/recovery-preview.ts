import { createHash, randomUUID } from 'node:crypto';
import { GenerateMacCommand, VerifyMacCommand, type KMSClient } from '@aws-sdk/client-kms';

export interface MacPort {
  generate(digest: Uint8Array, keyId: string, signal?: AbortSignal): Promise<string>;
  verify(digest: Uint8Array, keyId: string, mac: string, signal?: AbortSignal): Promise<boolean>;
}
export interface PreviewEnvelope {
  version: 1;
  previewId: string;
  scope: 'due-pending';
  ids: string[];
  limit: number;
  issuedAt: number;
  expiresAt: number;
  keyId: string;
  digest: string;
  mac: string;
}
export interface PreviewOptions {
  mac: MacPort;
  keyId: string;
  allowedKeyIds: string[];
  clock?: () => Date;
  uuid?: () => string;
  previewTtlSeconds?: number;
  signal?: AbortSignal;
}
export class KmsMac implements MacPort {
  constructor(private readonly client: Pick<KMSClient, 'send'>) {}
  async generate(digest: Uint8Array, keyId: string, signal?: AbortSignal): Promise<string> {
    const response = await this.client.send(
      new GenerateMacCommand({
        KeyId: keyId,
        Message: digest,
        MacAlgorithm: 'HMAC_SHA_256',
      }),
      { abortSignal: signal },
    );
    if (!response.Mac || response.Mac.length !== 32) throw new Error('KMS_MAC_UNAVAILABLE');
    return Buffer.from(response.Mac).toString('base64');
  }
  async verify(
    digest: Uint8Array,
    keyId: string,
    mac: string,
    signal?: AbortSignal,
  ): Promise<boolean> {
    const response = await this.client.send(
      new VerifyMacCommand({
        KeyId: keyId,
        Message: digest,
        Mac: Buffer.from(mac, 'base64'),
        MacAlgorithm: 'HMAC_SHA_256',
      }),
      { abortSignal: signal },
    );
    return response.MacValid === true;
  }
}
function canonical(value: Omit<PreviewEnvelope, 'digest' | 'mac'>): string {
  return JSON.stringify([
    value.version,
    value.previewId,
    value.scope,
    value.ids,
    value.limit,
    value.issuedAt,
    value.expiresAt,
    value.keyId,
  ]);
}
export function previewDigest(value: Omit<PreviewEnvelope, 'digest' | 'mac'>): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}
export async function issuePreview(
  ids: string[],
  limit: number,
  options: PreviewOptions,
): Promise<PreviewEnvelope> {
  const issuedAt = Math.floor((options.clock?.() ?? new Date()).getTime() / 1000);
  const value = {
    version: 1 as const,
    previewId: options.uuid?.() ?? randomUUID(),
    scope: 'due-pending' as const,
    ids: [...new Set(ids)].sort(),
    limit,
    issuedAt,
    expiresAt: issuedAt + (options.previewTtlSeconds ?? 300),
    keyId: options.keyId,
  };
  validateEnvelope(value, options);
  const digest = previewDigest(value);
  return {
    ...value,
    digest,
    mac: await options.mac.generate(Buffer.from(digest, 'hex'), value.keyId, options.signal),
  };
}
function validateEnvelope(
  value: Omit<PreviewEnvelope, 'digest' | 'mac'>,
  options: PreviewOptions,
): void {
  const now = Math.floor((options.clock?.() ?? new Date()).getTime() / 1000);
  if (
    value.version !== 1 ||
    value.scope !== 'due-pending' ||
    typeof value.previewId !== 'string' ||
    !/^[A-Za-z0-9._:-]{1,128}$/.test(value.previewId) ||
    !Number.isInteger(value.limit) ||
    value.limit < 1 ||
    value.limit > 25 ||
    !Array.isArray(value.ids) ||
    value.ids.length > value.limit ||
    value.ids.some(
      (id) => typeof id !== 'string' || !/^LOW_BATTERY:[A-Za-z0-9._:-]{1,128}$/.test(id),
    ) ||
    JSON.stringify(value.ids) !== JSON.stringify([...new Set(value.ids)].sort()) ||
    !Number.isSafeInteger(value.issuedAt) ||
    !Number.isSafeInteger(value.expiresAt) ||
    value.issuedAt > now ||
    value.expiresAt <= now ||
    value.expiresAt - value.issuedAt !== (options.previewTtlSeconds ?? 300) ||
    !options.allowedKeyIds.includes(value.keyId)
  )
    throw new Error('INVALID_OR_EXPIRED_PREVIEW');
}
export async function verifyPreview(
  value: PreviewEnvelope,
  options: PreviewOptions,
): Promise<void> {
  if (!value || typeof value !== 'object' || Object.keys(value).length !== 10)
    throw new Error('INVALID_OR_EXPIRED_PREVIEW');
  validateEnvelope(value, options);
  const digest = previewDigest(value);
  if (
    value.digest !== digest ||
    typeof value.mac !== 'string' ||
    value.mac.length !== 44 ||
    Buffer.from(value.mac, 'base64').length !== 32 ||
    Buffer.from(value.mac, 'base64').toString('base64') !== value.mac ||
    !(await options.mac.verify(Buffer.from(digest, 'hex'), value.keyId, value.mac, options.signal))
  )
    throw new Error('INVALID_PREVIEW_MAC');
}
