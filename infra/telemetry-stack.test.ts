import { describe, expect, it } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { TelemetryStack } from './telemetry-stack.js';

describe('infraestructura de telemetría', () => {
  const app = new cdk.App();
  const template = Template.fromStack(
    new TelemetryStack(app, 'Telemetry-test', { stage: 'staging' }),
  );
  it('expone solo POST con clave API y cuota acordada', () => {
    template.hasResourceProperties('AWS::ApiGateway::Method', {
      HttpMethod: 'POST',
      ApiKeyRequired: true,
    });
    template.hasResourceProperties('AWS::ApiGateway::UsagePlan', {
      Throttle: { RateLimit: 100, BurstLimit: 200 },
      Quota: { Limit: 5000000, Period: 'DAY' },
    });
  });
  it('aplica TTL, cifrado KMS y DLQ al quinto fallo', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TimeToLiveSpecification: { AttributeName: 'expiresAt', Enabled: true },
    });
    template.hasResourceProperties('AWS::SQS::Queue', {
      KmsMasterKeyId: Match.anyValue(),
      RedrivePolicy: { maxReceiveCount: 5, deadLetterTargetArn: Match.anyValue() },
    });
    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
      FunctionResponseTypes: ['ReportBatchItemFailures'],
    });
  });
  it('incluye permisos de transacción y auditoría CloudTrail', () => {
    const policies = template.findResources('AWS::IAM::Policy');
    expect(JSON.stringify(policies)).toContain('dynamodb:TransactWriteItems');
    template.resourceCountIs('AWS::CloudTrail::Trail', 1);
    template.resourceCountIs('AWS::DynamoDB::Table', 2);
  });
});
