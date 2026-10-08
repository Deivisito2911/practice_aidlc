import { randomUUID } from 'node:crypto';
import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  SQSBatchResponse,
  SQSEvent,
} from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SQSClient } from '@aws-sdk/client-sqs';
import { DynamoEventStore, SqsQueue, type EventStore, type Queue } from './adapters.js';
import { validateEvent, ValidationError, type InboundMessage } from './model.js';
import { processMessage, publishPending } from './service.js';

export function createIngestHandler(queue: Queue, clock: () => Date = () => new Date()) {
  return async (request: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    if (request.httpMethod !== 'POST' || request.path !== '/telemetry-events')
      return { statusCode: 404, body: JSON.stringify({ error: 'Ruta no encontrada' }) };
    const acceptedAt = clock().toISOString();
    const correlationId =
      Object.entries(request.headers ?? {}).find(
        ([key]) => key.toLowerCase() === 'x-correlation-id',
      )?.[1] || randomUUID();
    let message: InboundMessage;
    try {
      if (!request.body) throw new ValidationError('Cuerpo requerido');
      message = {
        event: validateEvent(request.body, new Date(acceptedAt)),
        rawPayload: request.body,
        acceptedAt,
        correlationId,
      };
    } catch (error) {
      if (error instanceof ValidationError)
        return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
      throw error;
    }
    try {
      await queue.send(JSON.stringify(message), correlationId);
      return {
        statusCode: 202,
        body: JSON.stringify({ status: 'accepted', msg_id: correlationId, acceptedAt }),
      };
    } catch (error) {
      console.error(
        JSON.stringify({
          level: 'ERROR',
          operation: 'enqueue',
          correlationId,
          cause: error instanceof Error ? error.name : 'unknown',
        }),
      );
      return {
        statusCode: 503,
        body: JSON.stringify({ error: 'Ingreso temporalmente no disponible' }),
      };
    }
  };
}

export function createProcessHandler(store: EventStore) {
  return async (event: SQSEvent): Promise<SQSBatchResponse> => {
    const batchItemFailures: { itemIdentifier: string }[] = [];
    for (const record of event.Records) {
      let message: InboundMessage | undefined;
      try {
        message = JSON.parse(record.body) as InboundMessage;
        await processMessage(message, store);
      } catch (error) {
        console.error(
          JSON.stringify({
            level: 'ERROR',
            operation: 'process',
            correlationId: message?.correlationId,
            eventId: message?.event?.eventId,
            receiveCount: record.attributes.ApproximateReceiveCount,
            cause: error instanceof Error ? error.message : 'unknown',
          }),
        );
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }
    return { batchItemFailures };
  };
}

export function createPublishHandler(
  store: EventStore,
  queue: Queue,
  clock: () => Date = () => new Date(),
) {
  return async (): Promise<{ published: number }> => ({
    published: await publishPending(store, queue, clock().toISOString()),
  });
}

const sqs = new SQSClient({});
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const store = new DynamoEventStore(
  dynamo,
  process.env.EVENTS_TABLE ?? '',
  process.env.OUTBOX_TABLE ?? '',
);
export const ingestHandler = createIngestHandler(
  new SqsQueue(sqs, process.env.INPUT_QUEUE_URL ?? ''),
);
export const processHandler = createProcessHandler(store);
export const publishHandler = createPublishHandler(
  store,
  new SqsQueue(sqs, process.env.ALERT_QUEUE_URL ?? ''),
);
