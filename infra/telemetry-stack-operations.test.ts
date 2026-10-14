import { describe, expect, it } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { TelemetryStack } from './telemetry-stack.js';

type Policy = {
  Type: string;
  Properties: {
    Roles: unknown;
    PolicyDocument: { Statement: Array<{ Action: string | string[]; Resource: unknown }> };
  };
};
type Metric = { Namespace?: string; MetricName?: string; Dimensions?: unknown; Unit?: string };
type Alarm = {
  Properties: Metric & {
    Metrics?: Array<{ Expression?: string; MetricStat?: { Metric: Metric; Unit?: string } }>;
    AlarmActions?: unknown[];
    AlarmDescription?: string;
  };
};

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
          Projection: { ProjectionType: 'KEYS_ONLY' },
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

  it('liga Query TTL y MAC al rol Lambda con recursos exactos, no al operador', () => {
    const resources = template.toJSON().Resources;
    const handlerId = Object.keys(resources).find(
      (id) => resources[id].Type === 'AWS::Lambda::Function',
    )!;
    const roleId = resources[handlerId].Properties.Role['Fn::GetAtt'][0];
    const policies = (Object.values(resources) as Policy[]).filter(
      (row) => row.Type === 'AWS::IAM::Policy',
    );
    const handlerPolicies = policies.filter((row) =>
      JSON.stringify(row.Properties.Roles).includes(roleId),
    );
    const statements = handlerPolicies.flatMap((row) => row.Properties.PolicyDocument.Statement);
    const reads = statements.filter((row) => [row.Action].flat().includes('dynamodb:GetItem'));
    expect(JSON.stringify(reads)).toContain('OutboxTable');
    const queries = statements.filter((row) => [row.Action].flat().includes('dynamodb:Query'));
    expect(queries).toHaveLength(2);
    expect(JSON.stringify(queries)).toContain('/index/TtlByShard');
    expect(JSON.stringify(queries)).toContain('/index/DueByShard');
    expect(JSON.stringify(queries)).not.toContain('/index/*');
    const mac = statements.find((row) => [row.Action].flat().includes('kms:GenerateMac'));
    expect(mac!.Action).toEqual(['kms:GenerateMac', 'kms:VerifyMac']);
    const operatorPolicies = policies.filter((row) =>
      JSON.stringify(row.Properties.Roles).includes('P3-operator'),
    );
    expect(operatorPolicies).toHaveLength(1);
    expect(operatorPolicies[0].Properties.PolicyDocument.Statement[0].Action).toBe(
      'lambda:InvokeFunction',
    );
    expect(JSON.stringify(operatorPolicies)).not.toContain('kms:');
    template.hasResourceProperties('AWS::KMS::Key', {
      KeySpec: 'HMAC_256',
      KeyUsage: 'GENERATE_VERIFY_MAC',
    });
    template.resourceCountIs('AWS::CloudTrail::Trail', 0);
  });
  it('consume las mismas series EMF, unidades y frontera inclusiva con destino', () => {
    const alarms = Object.values(template.findResources('AWS::CloudWatch::Alarm')) as Alarm[];
    const metrics: Metric[] = [];
    for (const row of alarms) {
      const p = row.Properties;
      if (p.Namespace === 'VehicleTelemetry') metrics.push(p);
      for (const entry of p.Metrics ?? [])
        if (entry.MetricStat?.Metric.Namespace === 'VehicleTelemetry')
          metrics.push({ ...entry.MetricStat.Metric, Unit: entry.MetricStat.Unit });
    }
    expect(metrics.length).toBeGreaterThanOrEqual(5);
    for (const metric of metrics) {
      expect(metric.Dimensions).toEqual([{ Name: 'Service', Value: 'TelemetryService' }]);
      expect(metric.Unit).toBe(
        metric.MetricName === 'OutboxOldestPendingAge' ? 'Seconds' : 'Count',
      );
    }
    const errorAlarm = alarms.find((row) =>
      row.Properties.Metrics?.some((item) => item.Expression?.includes('requests >= 100')),
    )!;
    expect(errorAlarm.Properties).toMatchObject({
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      Threshold: 1,
      EvaluationPeriods: 1,
    });
    for (const row of alarms) {
      expect(row.Properties.AlarmActions).toHaveLength(1);
      expect(row.Properties.AlarmDescription).toMatch(/Alta|Media|Baja/);
    }
    const body = JSON.stringify(template.findResources('AWS::CloudWatch::Dashboard'));
    expect(body).toContain('TODOS los minutos');
    expect(body).toContain('Unverified');
    expect(body).toContain('Service');
    expect(body).toContain('TelemetryService');
    expect(body).toContain('p95');
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
