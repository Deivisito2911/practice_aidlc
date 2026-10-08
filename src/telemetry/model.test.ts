import { describe, expect, it } from 'vitest';
import { toEventRecord, toOutbox, validateEvent, ValidationError } from './model.js';

const now = new Date('2026-10-08T12:00:00.000Z');
const raw =
  '{ "eventId":"evt-1", "vehicleId":"car-1", "eventType":"battery", "timestamp":"2026-10-08T12:05:00Z", "value":19.99 }';
describe('modelo de telemetría', () => {
  it('conserva JSON crudo, acceptedAt y TTL a 90 días', () => {
    const event = validateEvent(raw, now);
    const record = toEventRecord({
      event,
      rawPayload: raw,
      acceptedAt: now.toISOString(),
      correlationId: 'corr-1',
    });
    expect(record.rawPayload).toBe(raw);
    expect(record.expiresAt).toBe(Math.floor(now.getTime() / 1000) + 90 * 86400);
    expect(toOutbox(record)?.status).toBe('PENDING');
  });
  it.each([
    ['battery', 0],
    ['battery', 100],
    ['temperature', -50],
    ['temperature', 150],
    ['speed', 300],
  ])('acepta límite %s %s', (eventType, value) => {
    expect(
      validateEvent(
        JSON.stringify({
          eventId: 'e',
          vehicleId: 'v',
          eventType,
          timestamp: now.toISOString(),
          value,
        }),
        now,
      ).value,
    ).toBe(value);
  });
  it.each([
    ['battery', 100.01],
    ['temperature', -50.01],
    ['speed', 300.01],
  ])('rechaza fuera de rango %s %s', (eventType, value) => {
    expect(() =>
      validateEvent(
        JSON.stringify({
          eventId: 'e',
          vehicleId: 'v',
          eventType,
          timestamp: now.toISOString(),
          value,
        }),
        now,
      ),
    ).toThrow(ValidationError);
  });
  it('rechaza campo vacío y futuro mayor a cinco minutos', () => {
    expect(() => validateEvent(raw.replace('evt-1', ''), now)).toThrow(ValidationError);
    expect(() => validateEvent(raw.replace('12:05:00', '12:05:01'), now)).toThrow(ValidationError);
  });
  it('alerta estrictamente debajo de 20', () => {
    const event = validateEvent(raw.replace('19.99', '20'), now);
    expect(
      toOutbox(
        toEventRecord({
          event,
          rawPayload: raw,
          acceptedAt: now.toISOString(),
          correlationId: 'c',
        }),
      ),
    ).toBeUndefined();
  });
});
