import { createHmac } from 'node:crypto';
import type { Context } from 'aws-lambda';
import type { MacPort } from '../../src/telemetry/recovery-preview.js';
import { describe, expect, it, vi } from 'vitest';
import type { EventStore, Queue } from '../../src/telemetry/adapters.js';
import type { AlertOutbox } from '../../src/telemetry/model.js';
import { createTelemetryHandler } from '../../src/telemetry/handlers.js';

describe('integración de operaciones de telemetría', () => {
  it('preview→confirm publica alertId estable y conserva PENDING ante fallo parcial; scheduled permanece disponible', async () => {
    const rows: AlertOutbox[] = [1, 2].map((n) => ({
      alertId: `LOW_BATTERY:e${n}`,
      eventId: `e${n}`,
      vehicleId: `v${n}`,
      alertType: 'LOW_BATTERY',
      batteryValue: 12,
      occurredAt: '2026-01-01T00:00:00.000Z',
      correlationId: `corr-${n}`,
      status: 'PENDING',
      createdAt: '2026-01-01T00:00:00.000Z',
      dueShard: 'PENDING#1',
      nextAttemptAt: '2026-01-01T00:00:00.000Z',
      attempts: 0,
      schemaVersion: 1,
    }));
    const state = new Map(rows.map((row) => [row.alertId, 'PENDING']));
    const store: EventStore = {
      save: vi.fn(),
      readOutbox: vi.fn(async (id) => {
        const row = rows.find((item) => item.alertId === id);
        return row ? { ...row, status: state.get(id) as 'PENDING' | 'PUBLISHED' } : undefined;
      }),
      due: vi.fn(async () => rows.filter((row) => state.get(row.alertId) === 'PENDING')),
      claim: vi.fn(async (row) => ({
        ...row,
        claimToken: `claim-${row.eventId}`,
        attempts: row.attempts + 1,
      })),
      published: vi.fn(async (row) => {
        state.set(row.alertId, 'PUBLISHED');
        return true;
      }),
      defer: vi.fn(async (row) => {
        state.set(row.alertId, 'PENDING');
        return true;
      }),
    };
    const queue: Queue = {
      send: vi.fn(async (body) => {
        if (JSON.parse(body).eventId === 'e2') throw new Error('temporary SQS failure');
      }),
    };
    const mac: MacPort = {
      generate: async (value) =>
        createHmac('sha256', 'synthetic-key').update(value).digest('base64'),
      verify: async (value, key, signature) => signature === (await mac.generate(value, key)),
    };
    const context = {
      awsRequestId: 'lambda-request',
      getRemainingTimeInMillis: () => 20000,
    } as Context;
    const handler = createTelemetryHandler(store, queue, {
      clock: () => new Date('2026-01-01T00:01:00Z'),
      random: () => 0,
      preview: { mac, keyId: 'test', allowedKeyIds: ['test'] },
    });
    const preview = (await handler(
      {
        operation: 'manual-recovery',
        action: 'preview',
        limit: 25,
        correlationId: 'run-42',
      },
      context,
    )) as Record<string, unknown>;
    expect(preview).toMatchObject({ count: 2, limit: 25 });
    const execute = (await handler(
      {
        operation: 'manual-recovery',
        action: 'execute',
        preview: preview.envelope,
        confirmation: preview.fingerprint,
        correlationId: 'run-42',
      },
      context,
    )) as Record<string, unknown>;
    expect(execute).toMatchObject({ confirmed: 1, failed: 1, pending: 1 });
    expect(state.get('LOW_BATTERY:e1')).toBe('PUBLISHED');
    expect(state.get('LOW_BATTERY:e2')).toBe('PENDING');
    expect(queue.send).toHaveBeenCalledTimes(2);
    const scheduled = await handler({
      source: 'aws.events',
      'detail-type': 'Scheduled Event',
      detail: {},
    });
    expect(scheduled).toHaveProperty('processed');
  });
});
