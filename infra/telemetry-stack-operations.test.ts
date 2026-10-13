import { describe, expect, it } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { TelemetryStack } from './telemetry-stack.js';

describe('infraestructura de operaciones U2', () => {
  const template = Template.fromStack(
    new TelemetryStack(new cdk.App(), 'Ops-test', {
      stage: 'staging',
      operatorRoleArn: 'arn:aws:iam::111122223333:role/P3-operator',
      alarmTopicArn: 'arn:aws:sns:us-east-1:111122223333:oncall',
    }),
  );

  it('añade GSI TTL sharded y permite backfill condicional con acceso de servicio', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: 'TtlByShard',
          KeySchema: [
            { AttributeName: 'ttlShard', KeyType: 'HASH' },
            { AttributeName: 'expiresAt', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'INCLUDE', NonKeyAttributes: ['eventId'] },
        }),
      ]),
    });
    const policies = JSON.stringify(template.findResources('AWS::IAM::Policy'));
    expect(policies).toContain('dynamodb:Scan');
    expect(policies).toContain('dynamodb:UpdateItem');
    expect(policies).toContain('lambda:InvokeFunction');
    expect(policies).toContain('P3-operator');
    expect(policies).not.toContain('dynamodb:DeleteItem');
  });

  it('mantiene una Lambda y una cola de alertas y configura alarmas con destino', () => {
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.resourceCountIs('AWS::SQS::Queue', 1);
    const alarms = template.findResources('AWS::CloudWatch::Alarm');
    expect(Object.keys(alarms).length).toBeGreaterThanOrEqual(6);
    const alarmJson = JSON.stringify(alarms);
    expect(alarmJson).toContain('VehicleTelemetry');
    expect(alarmJson).toContain('AlarmActions');
    expect(alarmJson).toContain('100');
    expect(alarmJson).toContain('600');
    template.hasResourceProperties('AWS::ApiGateway::UsagePlan', {
      Throttle: { RateLimit: 100, BurstLimit: 200 },
      Quota: { Limit: 5000000, Period: 'DAY' },
    });
  });
});
