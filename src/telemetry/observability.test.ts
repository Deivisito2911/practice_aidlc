import { describe, expect, it, vi } from 'vitest';
import {
  METRIC_UNITS,
  emitMetric,
  observeHttp,
  observeService,
  serviceErrorRate,
} from './observability.js';
describe('señales EMF y población HTTP', () => {
  it('cada métrica tiene dimensión exacta, unidad y whitelist de contexto', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      for (const [name, unit] of Object.entries(METRIC_UNITS)) {
        emitMetric(name, 1, {
          correlationId: 'c',
          category: 'test',
          mac: 'hidden',
          rawPayload: 'secret',
        });
        const result = JSON.parse(String(spy.mock.calls.at(-1)![0]));
        expect(result._aws.CloudWatchMetrics[0]).toEqual({
          Namespace: 'VehicleTelemetry',
          Dimensions: [['Service']],
          Metrics: [{ Name: name, Unit: unit }],
        });
        expect(result.Service).toBe('TelemetryService');
        expect(result.correlationId).toBe('c');
        expect(result).not.toHaveProperty('mac');
        expect(result).not.toHaveProperty('rawPayload');
      }
    } finally {
      spy.mockRestore();
    }
  });
  it('conserva total y excluye 4xx/cuota del denominador elegible', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      for (const code of [202, 400, 409, 429, 503]) observeHttp(code, 'c', 'lambda-request', 0.1);
      const rows = spy.mock.calls.map((call) => JSON.parse(String(call[0])));
      expect(rows.filter((row) => row.HttpRequests === 1)).toHaveLength(5);
      expect(rows.filter((row) => row.HttpEligibleRequests === 1)).toHaveLength(2);
      expect(rows.filter((row) => row.HttpServiceErrors === 1)).toHaveLength(1);
      expect(rows.filter((row) => row.HttpQuotaRejected === 1)).toHaveLength(1);
    } finally {
      spy.mockRestore();
    }
  });
  it.each([
    [100, 1, 1],
    [100, 0, 0],
    [99, 1, 0],
  ])('frontera %s/%s = %s', (eligible, errors, percent) => {
    expect(serviceErrorRate(eligible, errors)).toBe(percent);
  });
  it('observa segundos a commit y rechaza valores inválidos', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      observeService({ name: 'ReceiveToCommit', seconds: 0.2, correlationId: 'c' });
      expect(JSON.parse(String(spy.mock.calls[0][0])).ReceiveToCommit).toBe(0.2);
      expect(() => emitMetric('ReceiveToCommit', NaN)).toThrow();
    } finally {
      spy.mockRestore();
    }
  });
});
