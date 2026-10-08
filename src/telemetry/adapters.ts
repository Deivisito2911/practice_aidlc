import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type { AlertOutbox, EventRecord } from './model.js';

export interface Queue {
  send(body: string, correlationId: string): Promise<void>;
}
export interface EventStore {
  save(record: EventRecord, outbox?: AlertOutbox): Promise<'created' | 'duplicate' | 'conflict'>;
  pending(now: string): Promise<AlertOutbox[]>;
  published(alertId: string): Promise<void>;
}

export class SqsQueue implements Queue {
  constructor(
    private readonly client: SQSClient,
    private readonly url: string,
  ) {}
  async send(body: string, correlationId: string): Promise<void> {
    const response = await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.url,
        MessageBody: body,
        MessageAttributes: { correlationId: { DataType: 'String', StringValue: correlationId } },
      }),
    );
    if (!response.MessageId) throw new Error('SQS no confirmó MessageId');
  }
}

export class DynamoEventStore implements EventStore {
  constructor(
    private readonly client: DynamoDBDocumentClient,
    private readonly eventsTable: string,
    private readonly outboxTable: string,
  ) {}
  async save(
    record: EventRecord,
    outbox?: AlertOutbox,
  ): Promise<'created' | 'duplicate' | 'conflict'> {
    try {
      if (outbox)
        await this.client.send(
          new TransactWriteCommand({
            TransactItems: [
              {
                Put: {
                  TableName: this.eventsTable,
                  Item: record,
                  ConditionExpression: 'attribute_not_exists(eventId)',
                },
              },
              {
                Put: {
                  TableName: this.outboxTable,
                  Item: outbox,
                  ConditionExpression: 'attribute_not_exists(alertId)',
                },
              },
            ],
          }),
        );
      else
        await this.client.send(
          new PutCommand({
            TableName: this.eventsTable,
            Item: record,
            ConditionExpression: 'attribute_not_exists(eventId)',
          }),
        );
      return 'created';
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name !== 'ConditionalCheckFailedException' && name !== 'TransactionCanceledException')
        throw error;
      const existing = await this.client.send(
        new GetCommand({
          TableName: this.eventsTable,
          Key: { eventId: record.eventId },
          ConsistentRead: true,
        }),
      );
      if (!existing.Item) throw error;
      return existing.Item.canonicalHash === record.canonicalHash ? 'duplicate' : 'conflict';
    }
  }
  async pending(now: string): Promise<AlertOutbox[]> {
    const response = await this.client.send(
      new QueryCommand({
        TableName: this.outboxTable,
        IndexName: 'PendingByTime',
        KeyConditionExpression: 'pendingBucket = :pending AND nextAttemptAt <= :now',
        ExpressionAttributeValues: { ':pending': 'PENDING', ':now': now },
      }),
    );
    return (response.Items ?? []) as AlertOutbox[];
  }
  async published(alertId: string): Promise<void> {
    await this.client.send(
      new UpdateCommand({
        TableName: this.outboxTable,
        Key: { alertId },
        UpdateExpression: 'SET #status = :published REMOVE pendingBucket, nextAttemptAt',
        ConditionExpression: '#status = :pending',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':published': 'PUBLISHED', ':pending': 'PENDING' },
      }),
    );
  }
}
