import { randomUUID } from 'node:crypto';
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type { TransactWriteCommandInput } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { ttlShardFor, type AlertOutbox, type EventRecord } from './model.js';

export interface Queue {
  send(body: string, correlationId: string): Promise<void>;
}
export type SaveResult = { outcome: 'created' | 'duplicate' | 'conflict'; record?: EventRecord };
export interface EventStore {
  save(record: EventRecord, outbox?: AlertOutbox): Promise<SaveResult>;
  due(now: string, limit: number): Promise<AlertOutbox[]>;
  ttlEligible?(nowEpoch: number, limit: number): Promise<number>;
  backfillTtl?(
    cursor?: Record<string, unknown>,
  ): Promise<{ scanned: number; updated: number; cursor?: Record<string, unknown> }>;
  pendingSnapshot?(now: string): Promise<{ count: number; oldestAgeSeconds: number }>;
  claim(item: AlertOutbox, now: string, leaseSeconds: number): Promise<AlertOutbox | undefined>;
  published(item: AlertOutbox, token: string, now: string): Promise<boolean>;
  defer(item: AlertOutbox, token: string, nextAttemptAt: string): Promise<boolean>;
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
    private readonly uuid: () => string = randomUUID,
  ) {}

  async save(record: EventRecord, outbox?: AlertOutbox): Promise<SaveResult> {
    try {
      const transactItems: NonNullable<TransactWriteCommandInput['TransactItems']> = [
        {
          Put: {
            TableName: this.eventsTable,
            Item: record,
            ConditionExpression: 'attribute_not_exists(eventId)',
          },
        },
      ];
      if (outbox)
        transactItems.push({
          Put: {
            TableName: this.outboxTable,
            Item: outbox,
            ConditionExpression: 'attribute_not_exists(alertId)',
          },
        });
      await this.client.send(new TransactWriteCommand({ TransactItems: transactItems }));
      return { outcome: 'created', record };
    } catch (error) {
      // A failed conditional write and an uncertain network response both require a coherent read.
      const existing = await this.readEvent(record.eventId);
      if (!existing) throw error;
      return existing.canonicalHash === record.canonicalHash
        ? { outcome: 'duplicate', record: existing }
        : { outcome: 'conflict', record: existing };
    }
  }

  private async readEvent(eventId: string): Promise<EventRecord | undefined> {
    const response = await this.client.send(
      new GetCommand({ TableName: this.eventsTable, Key: { eventId }, ConsistentRead: true }),
    );
    return response.Item as EventRecord | undefined;
  }

  async due(now: string, limit: number): Promise<AlertOutbox[]> {
    if (!Number.isInteger(limit) || limit < 1) return [];
    limit = Math.min(25, limit);
    const due: AlertOutbox[] = [];
    const firstShard = Math.floor(Date.parse(now) / 60_000) % 16;
    const perShardLimit = Math.max(1, Math.ceil(limit / 16));
    for (let offset = 0; offset < 16 && due.length < limit; offset++) {
      const shard = (firstShard + offset) % 16;
      let shardCount = 0;
      let cursor: Record<string, unknown> | undefined;
      do {
        const pageLimit = Math.min(perShardLimit - shardCount, limit - due.length);
        const response = await this.client.send(
          new QueryCommand({
            TableName: this.outboxTable,
            IndexName: 'DueByShard',
            KeyConditionExpression: 'dueShard = :shard AND nextAttemptAt <= :now',
            ExpressionAttributeValues: { ':shard': `PENDING#${shard}`, ':now': now },
            ExclusiveStartKey: cursor,
            Limit: pageLimit,
          }),
        );
        due.push(...((response.Items ?? []) as AlertOutbox[]));
        shardCount += response.Items?.length ?? 0;
        cursor = response.LastEvaluatedKey;
      } while (cursor && due.length < limit && shardCount < perShardLimit);
    }
    return due.slice(0, limit);
  }

  async ttlEligible(nowEpoch: number, limit: number): Promise<number> {
    const cutoff = nowEpoch - 24 * 60 * 60;
    const capped = Math.max(1, Math.min(1001, limit));
    let count = 0;
    for (let shard = 0; shard < 16 && count < capped; shard++) {
      let cursor: Record<string, unknown> | undefined;
      do {
        const response = await this.client.send(
          new QueryCommand({
            TableName: this.eventsTable,
            IndexName: 'TtlByShard',
            KeyConditionExpression: 'ttlShard = :shard AND expiresAt <= :cutoff',
            ExpressionAttributeValues: { ':shard': `TTL#${shard}`, ':cutoff': cutoff },
            ProjectionExpression: 'eventId',
            ExclusiveStartKey: cursor,
            Limit: Math.min(100, capped - count),
          }),
        );
        count += response.Items?.length ?? 0;
        cursor = response.LastEvaluatedKey;
      } while (cursor && count < capped);
    }
    return count;
  }

  async pendingSnapshot(now: string): Promise<{ count: number; oldestAgeSeconds: number }> {
    const cap = 101;
    const pending: AlertOutbox[] = [];
    const firstShard = Math.floor(Date.parse(now) / 60_000) % 16;
    for (let offset = 0; offset < 16 && pending.length < cap; offset++) {
      const shard = (firstShard + offset) % 16;
      let cursor: Record<string, unknown> | undefined;
      do {
        const response = await this.client.send(
          new QueryCommand({
            TableName: this.outboxTable,
            IndexName: 'DueByShard',
            KeyConditionExpression: 'dueShard = :shard',
            FilterExpression: '#status = :pending',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':shard': `PENDING#${shard}`, ':pending': 'PENDING' },
            ProjectionExpression: 'alertId, createdAt, #status',
            ExclusiveStartKey: cursor,
            Limit: Math.min(101, cap - pending.length),
            ScanIndexForward: true,
          }),
        );
        pending.push(...((response.Items ?? []) as AlertOutbox[]));
        cursor = response.LastEvaluatedKey as Record<string, unknown> | undefined;
      } while (cursor && pending.length < cap);
    }
    const oldestCreated = pending
      .map((item) => Date.parse(item.createdAt))
      .filter(Number.isFinite)
      .sort((a, b) => a - b)[0];
    return {
      count: pending.length,
      oldestAgeSeconds:
        oldestCreated === undefined
          ? 0
          : Math.max(0, Math.floor((Date.parse(now) - oldestCreated) / 1000)),
    };
  }

  async backfillTtl(
    cursor?: Record<string, unknown>,
  ): Promise<{ scanned: number; updated: number; cursor?: Record<string, unknown> }> {
    const response = await this.client.send(
      new ScanCommand({
        TableName: this.eventsTable,
        ProjectionExpression: 'eventId, expiresAt, ttlShard',
        FilterExpression: 'attribute_exists(expiresAt) AND attribute_not_exists(ttlShard)',
        ExclusiveStartKey: cursor,
        Limit: 25,
      }),
    );
    const items = (response.Items ?? []) as Array<{ eventId: string; expiresAt: number }>;
    let updated = 0;
    for (const item of items) {
      try {
        await this.client.send(
          new UpdateCommand({
            TableName: this.eventsTable,
            Key: { eventId: item.eventId },
            UpdateExpression: 'SET ttlShard = :shard',
            ConditionExpression:
              'attribute_exists(expiresAt) AND attribute_not_exists(ttlShard) AND expiresAt = :expires',
            ExpressionAttributeValues: {
              ':shard': ttlShardFor(item.eventId),
              ':expires': item.expiresAt,
            },
          }),
        );
        updated++;
      } catch (error) {
        if (!(error instanceof Error && error.name === 'ConditionalCheckFailedException'))
          throw error;
      }
    }
    return {
      scanned: items.length,
      updated,
      cursor: response.LastEvaluatedKey as Record<string, unknown> | undefined,
    };
  }

  async claim(
    item: AlertOutbox,
    now: string,
    leaseSeconds: number,
  ): Promise<AlertOutbox | undefined> {
    const token = this.uuid();
    const leaseUntil = new Date(Date.parse(now) + leaseSeconds * 1000).toISOString();
    try {
      const response = await this.client.send(
        new UpdateCommand({
          TableName: this.outboxTable,
          Key: { alertId: item.alertId },
          UpdateExpression:
            'SET claimToken = :token, leaseUntil = :lease, lastAttemptAt = :now, nextAttemptAt = :lease ADD attempts :one',
          ConditionExpression:
            '#status = :pending AND nextAttemptAt <= :now AND (attribute_not_exists(leaseUntil) OR leaseUntil <= :now)',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':token': token,
            ':lease': leaseUntil,
            ':one': 1,
            ':pending': 'PENDING',
            ':now': now,
          },
          ReturnValues: 'ALL_NEW',
        }),
      );
      const updated = response.Attributes as AlertOutbox | undefined;
      if (!updated) throw new Error('DynamoDB no devolvió el Outbox reclamado');
      return updated;
    } catch (error) {
      if (
        error instanceof Error &&
        ['ConditionalCheckFailedException', 'TransactionCanceledException'].includes(error.name)
      )
        return undefined;
      throw error;
    }
  }

  async published(item: AlertOutbox, token: string, now: string): Promise<boolean> {
    try {
      await this.client.send(
        new UpdateCommand({
          TableName: this.outboxTable,
          Key: { alertId: item.alertId },
          UpdateExpression:
            'SET #status = :published REMOVE dueShard, nextAttemptAt, claimToken, leaseUntil',
          ConditionExpression: '#status = :pending AND claimToken = :token AND leaseUntil > :now',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':published': 'PUBLISHED',
            ':pending': 'PENDING',
            ':token': token,
            ':now': now,
          },
        }),
      );
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') return false;
      throw error;
    }
  }

  async defer(item: AlertOutbox, token: string, nextAttemptAt: string): Promise<boolean> {
    try {
      await this.client.send(
        new UpdateCommand({
          TableName: this.outboxTable,
          Key: { alertId: item.alertId },
          UpdateExpression: 'SET nextAttemptAt = :next REMOVE claimToken, leaseUntil',
          ConditionExpression: '#status = :pending AND claimToken = :token',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':next': nextAttemptAt,
            ':pending': 'PENDING',
            ':token': token,
          },
        }),
      );
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'ConditionalCheckFailedException') return false;
      throw error;
    }
  }
}
