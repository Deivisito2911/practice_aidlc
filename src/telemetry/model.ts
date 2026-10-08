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
export interface EventRecord extends TelemetryEvent {
  rawPayload: string;
  acceptedAt: string;
  correlationId: string;
  expiresAt: number;
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
  pendingBucket?: string;
  nextAttemptAt?: string;
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
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    throw new ValidationError('Objeto requerido');
  const value = candidate as Record<string, unknown>;
  if (
    typeof value.eventId !== 'string' ||
    !value.eventId.trim() ||
    typeof value.vehicleId !== 'string' ||
    !value.vehicleId.trim()
  )
    throw new ValidationError('Identificadores requeridos');
  if (
    value.eventType !== 'battery' &&
    value.eventType !== 'temperature' &&
    value.eventType !== 'speed'
  )
    throw new ValidationError('eventType inválido');
  const [min, max] = ranges[value.eventType];
  if (
    typeof value.value !== 'number' ||
    !Number.isFinite(value.value) ||
    value.value < min ||
    value.value > max
  )
    throw new ValidationError('value fuera de rango');
  if (
    typeof value.timestamp !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value.timestamp)
  )
    throw new ValidationError('timestamp UTC requerido');
  const parsed = new Date(value.timestamp);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 19) !== value.timestamp.slice(0, 19) ||
    parsed.getTime() > now.getTime() + 300000
  )
    throw new ValidationError('timestamp inválido o futuro');
  return {
    eventId: value.eventId,
    vehicleId: value.vehicleId,
    eventType: value.eventType,
    timestamp: value.timestamp,
    value: value.value,
  };
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
    canonicalHash: canonicalHash(message.event),
    schemaVersion: 1,
  };
}
export function toOutbox(record: EventRecord): AlertOutbox | undefined {
  if (record.eventType !== 'battery' || record.value >= 20) return undefined;
  return {
    alertId: createHash('sha256')
      .update(JSON.stringify([record.eventId, record.eventType]))
      .digest('hex'),
    eventId: record.eventId,
    vehicleId: record.vehicleId,
    alertType: 'LOW_BATTERY',
    batteryValue: record.value,
    occurredAt: record.timestamp,
    correlationId: record.correlationId,
    status: 'PENDING',
    pendingBucket: 'PENDING',
    nextAttemptAt: record.acceptedAt,
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
