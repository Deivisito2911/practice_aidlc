import { describe, expect, it } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { TelemetryStack } from './telemetry-stack.js';

describe('infraestructura de telemetría', () => {
  const template = Template.fromStack(
    new TelemetryStack(new cdk.App(), 'Telemetry-test', { stage: 'staging' }),
  );
  it('despliega una Lambda y conecta API REST y EventBridge a ella', () => {
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    template.resourceCountIs('AWS::Events::Rule', 1);
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'POST',
      ApiKeyRequired: true,
    });
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: 'rate(1 minute)',
      Targets: Match.arrayWith([Match.objectLike({ Arn: { 'Fn::GetAtt': Match.anyValue() } })]),
    });
    template.hasResourceProperties('AWS::Lambda::Function', {
      MemorySize: 512,
      Timeout: 20,
      Runtime: 'nodejs22.x',
      Handler: 'index.telemetryHandler',
    });
  });
  it('crea dos tablas cifradas, TTL de eventos y GSI disperso de recuperación', () => {
    template.resourceCountIs('AWS::DynamoDB::Table', 2);
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TimeToLiveSpecification: { AttributeName: 'expiresAt', Enabled: true },
      SSESpecification: { SSEEnabled: true, SSEType: 'KMS' },
    });
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      GlobalSecondaryIndexes: Match.arrayWith([
        Match.objectLike({
          IndexName: 'DueByShard',
          KeySchema: [
            { AttributeName: 'dueShard', KeyType: 'HASH' },
            { AttributeName: 'nextAttemptAt', KeyType: 'RANGE' },
          ],
        }),
      ]),
    });
  });
  it('mantiene únicamente SQS de alertas y no crea mapeos de streams', () => {
    template.resourceCountIs('AWS::SQS::Queue', 1);
    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'telemetry-staging-alerts',
      KmsMasterKeyId: Match.anyValue(),
    });
    expect(JSON.stringify(template.findResources('AWS::SQS::QueuePolicy'))).toContain(
      'aws:SecureTransport',
    );
    template.resourceCountIs('AWS::Lambda::EventSourceMapping', 0);
  });
  it('incluye permisos IAM requeridos para Put transaccional, CloudTrail y throttling del API', () => {
    const policy = JSON.stringify(template.findResources('AWS::IAM::Policy'));
    expect(policy).toContain('dynamodb:PutItem');
    expect(policy).toContain('dynamodb:UpdateItem');
    expect(policy).toContain('dynamodb:Query');
    expect(policy).not.toContain('dynamodb:TransactWriteItems');
    template.resourceCountIs('AWS::CloudTrail::Trail', 1);
    template.hasResourceProperties('AWS::ApiGateway::UsagePlan', {
      Throttle: { RateLimit: 100, BurstLimit: 200 },
      Quota: { Limit: 5000000, Period: 'DAY' },
    });
  });
});
