import { createHash } from 'node:crypto';

export type EventType = 'battery' | 'temperature' | 'speed';
export interface TelemetryEvent {
  eventId: string;
  vehicleId: string;
  eventType: EventType;
  timestamp: string;
  value: number;
}
export interface InboundMessage {
  event: TelemetryEvent;
  rawPayload: string;
  acceptedAt: string;
  correlationId: string;
}
export interface AcceptedResponse {
  status: 'accepted';
  eventId: string;
  acceptedAt: string;
  correlationId: string;
}
export interface EventRecord extends TelemetryEvent {
  rawPayload: string;
  acceptedAt: string;
  correlationId: string;
  expiresAt: number;
  ttlShard: string;
  canonicalHash: string;
  schemaVersion: 1;
}
export interface AlertOutbox {
  alertId: string;
  eventId: string;
  vehicleId: string;
  alertType: 'LOW_BATTERY';
  batteryValue: number;
  occurredAt: string;
  correlationId: string;
  status: 'PENDING' | 'PUBLISHED';
  createdAt: string;
  dueShard?: string;
  nextAttemptAt?: string;
  attempts: number;
  lastAttemptAt?: string;
  claimToken?: string;
  leaseUntil?: string;
  schemaVersion: 1;
}
export interface BatteryAlert {
  alertId: string;
  eventId: string;
  vehicleId: string;
  alertType: 'LOW_BATTERY';
  batteryValue: number;
  occurredAt: string;
}

const ranges: Record<EventType, [number, number]> = {
  battery: [0, 100],
  temperature: [-50, 150],
  speed: [0, 300],
};
export class ValidationError extends Error {}

export function validateEvent(rawPayload: string, now: Date): TelemetryEvent {
  let candidate: unknown;
  try {
    candidate = JSON.parse(rawPayload);
  } catch {
    throw new ValidationError('JSON inválido');
  }
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new ValidationError('Objeto requerido');
  }
  const value = candidate as Record<string, unknown>;
  const allowed = ['eventId', 'vehicleId', 'eventType', 'timestamp', 'value'];
  if (
    Object.keys(value).length !== allowed.length ||
    Object.keys(value).some((key) => !allowed.includes(key))
  ) {
    throw new ValidationError('El evento debe contener exactamente cinco campos');
  }
  if (!isIdentifier(value.eventId) || !isIdentifier(value.vehicleId)) {
    throw new ValidationError('Identificadores ASCII requeridos (1–128 caracteres)');
  }
  if (
    value.eventType !== 'battery' &&
    value.eventType !== 'temperature' &&
    value.eventType !== 'speed'
  ) {
    throw new ValidationError('eventType inválido');
  }
  const [min, max] = ranges[value.eventType];
  if (
    typeof value.value !== 'number' ||
    !Number.isFinite(value.value) ||
    value.value < min ||
    value.value > max
  ) {
    throw new ValidationError('value fuera de rango');
  }
  if (
    typeof value.timestamp !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value.timestamp)
  ) {
    throw new ValidationError('timestamp UTC requerido');
  }
  const parsed = new Date(value.timestamp);
  const expectedTimestamp = value.timestamp.includes('.')
    ? value.timestamp.replace(/\.(\d+)Z$/, (_, fraction: string) => `.${fraction.padEnd(3, '0')}Z`)
    : value.timestamp.replace(/Z$/, '.000Z');
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString() !== expectedTimestamp ||
    parsed.getTime() > now.getTime() + 300000
  ) {
    throw new ValidationError('timestamp inválido o futuro');
  }
  return {
    eventId: value.eventId,
    vehicleId: value.vehicleId,
    eventType: value.eventType,
    timestamp: parsed.toISOString(),
    value: value.value,
  };
}

function isIdentifier(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(value);
}

export function canonicalHash(event: TelemetryEvent): string {
  return createHash('sha256')
    .update(
      JSON.stringify([
        event.eventId,
        event.vehicleId,
        event.eventType,
        new Date(event.timestamp).toISOString(),
        event.value,
      ]),
    )
    .digest('hex');
}

export function toEventRecord(message: InboundMessage): EventRecord {
  return {
    ...message.event,
    rawPayload: message.rawPayload,
    acceptedAt: message.acceptedAt,
    correlationId: message.correlationId,
    expiresAt: Math.floor(Date.parse(message.acceptedAt) / 1000) + 90 * 86400,
    ttlShard: ttlShardFor(message.event.eventId),
    canonicalHash: canonicalHash(message.event),
    schemaVersion: 1,
  };
}

export function ttlShardFor(eventId: string): string {
  return `TTL#${parseInt(createHash('sha256').update(eventId).digest('hex').slice(0, 8), 16) % 16}`;
}

export function dueShardFor(eventId: string): string {
  return `PENDING#${parseInt(createHash('sha256').update(eventId).digest('hex').slice(0, 8), 16) % 16}`;
}

export function toOutbox(record: EventRecord): AlertOutbox | undefined {
  if (record.eventType !== 'battery' || record.value >= 20) return undefined;
  return {
    alertId: `LOW_BATTERY:${record.eventId}`,
    eventId: record.eventId,
    vehicleId: record.vehicleId,
    alertType: 'LOW_BATTERY',
    batteryValue: record.value,
    occurredAt: record.timestamp,
    correlationId: record.correlationId,
    status: 'PENDING',
    createdAt: record.acceptedAt,
    dueShard: dueShardFor(record.eventId),
    nextAttemptAt: new Date(Date.parse(record.acceptedAt)).toISOString(),
    attempts: 0,
    schemaVersion: 1,
  };
}

export function toAlert(outbox: AlertOutbox): BatteryAlert {
  return {
    alertId: outbox.alertId,
    eventId: outbox.eventId,
    vehicleId: outbox.vehicleId,
    alertType: 'LOW_BATTERY',
    batteryValue: outbox.batteryValue,
    occurredAt: outbox.occurredAt,
  };
}
