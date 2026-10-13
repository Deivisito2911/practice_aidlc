import { describe, expect, it } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TelemetryStack } from './telemetry-stack.js';

const app = new cdk.App();
const template = Template.fromStack(
  new TelemetryStack(app, 'DeliveryControls-test', { stage: 'staging' }),
);

function references(resource: unknown, logicalId: string): boolean {
  if (Array.isArray(resource)) return resource.some((value) => references(value, logicalId));
  if (resource === null || typeof resource !== 'object') return false;
  const value = resource as Record<string, unknown>;
  if (value.Ref === logicalId) return true;
  if (Array.isArray(value['Fn::GetAtt']) && value['Fn::GetAtt'][0] === logicalId) return true;
  return Object.values(value).some((child) => references(child, logicalId));
}

type PolicyStatement = Record<string, unknown>;

function policyStatements(document: unknown): PolicyStatement[] {
  if (document === null || typeof document !== 'object') return [];
  const statements = (document as { Statement?: unknown }).Statement;
  return Array.isArray(statements) ? (statements as PolicyStatement[]) : [];
}

function policyActions(document: unknown): string[] {
  const statements = policyStatements(document);
  return statements.flatMap((statement) => {
    const action = statement.Action;
    return Array.isArray(action) ? action.map(String) : typeof action === 'string' ? [action] : [];
  });
}

describe('controles de entrega e auditoría U3', () => {
  it('preserva el walking skeleton con sus recursos y activadores únicos', () => {
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.resourceCountIs('AWS::DynamoDB::Table', 2);
    template.resourceCountIs('AWS::SQS::Queue', 1);

    const lambdaFunctions = template.findResources('AWS::Lambda::Function');
    const functionId = Object.keys(lambdaFunctions)[0];
    const queues = Object.values(template.findResources('AWS::SQS::Queue'));
    expect(queues[0].Properties?.RedrivePolicy).toBeUndefined();

    const methods = Object.values(template.findResources('AWS::ApiGateway::Method'));
    expect(
      methods.some(
        (method) =>
          method.Properties?.HttpMethod === 'POST' &&
          references(method.Properties?.Integration, functionId),
      ),
    ).toBe(true);

    const rules = Object.values(template.findResources('AWS::Events::Rule'));
    expect(
      rules.some((rule) =>
        (rule.Properties?.Targets ?? []).some((target: unknown) => references(target, functionId)),
      ),
    ).toBe(true);
  });

  it('retiene logs CloudTrail cifrados y bloqueados por al menos 90 días', () => {
    const trails = template.findResources('AWS::CloudTrail::Trail');
    expect(Object.keys(trails)).toHaveLength(1);
    const trail = Object.values(trails)[0];
    expect(trail.Properties?.IsLogging).toBe(true);
    expect(trail.Properties?.IncludeGlobalServiceEvents).toBe(true);
    const eventSelectors = trail.Properties?.EventSelectors ?? [];
    expect(
      eventSelectors.length === 0 ||
        eventSelectors.some(
          (selector: Record<string, unknown>) => selector.IncludeManagementEvents === true,
        ),
    ).toBe(true);
    const buckets = template.findResources('AWS::S3::Bucket');
    const auditBucketId = Object.keys(buckets).find((logicalId) =>
      references(trail.Properties?.S3BucketName, logicalId),
    );
    expect(auditBucketId).toBeDefined();
    const bucket = buckets[auditBucketId!];

    expect(trail.Properties?.KMSKeyId).toBeDefined();
    expect(bucket.Properties?.BucketEncryption?.ServerSideEncryptionConfiguration).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ServerSideEncryptionByDefault: expect.objectContaining({ SSEAlgorithm: 'aws:kms' }),
        }),
      ]),
    );
    expect(bucket.Properties?.ObjectLockEnabled).toBe(true);
    expect(bucket.Properties?.ObjectLockConfiguration?.ObjectLockEnabled).toBe('Enabled');
    expect(
      bucket.Properties?.ObjectLockConfiguration?.Rule?.DefaultRetention?.Days,
    ).toBeGreaterThanOrEqual(90);
    expect(bucket.Properties?.ObjectLockConfiguration?.Rule?.DefaultRetention?.Mode).toBe(
      'COMPLIANCE',
    );
    expect(bucket.Properties?.PublicAccessBlockConfiguration).toEqual({
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true,
    });
    expect(bucket.Properties?.VersioningConfiguration?.Status).toBe('Enabled');

    const bucketPolicies = Object.values(template.findResources('AWS::S3::BucketPolicy')).filter(
      (policy) => references(policy.Properties?.Bucket, auditBucketId!),
    );
    const deniesInsecureTransport = bucketPolicies.some((policy) =>
      (policy.Properties?.PolicyDocument?.Statement ?? []).some(
        (statement: Record<string, unknown>) =>
          statement.Effect === 'Deny' &&
          (statement.Condition as { Bool?: Record<string, string> } | undefined)?.Bool?.[
            'aws:SecureTransport'
          ] === 'false' &&
          references(statement.Resource, auditBucketId!),
      ),
    );
    expect(deniesInsecureTransport).toBe(true);
  });

  it('keeps effective Lambda permissions away from CloudTrail administration and audit deletion', () => {
    const functionResource = Object.values(template.findResources('AWS::Lambda::Function'))[0];
    const roleId = Object.keys(template.findResources('AWS::IAM::Role')).find((logicalId) =>
      references(functionResource.Properties?.Role, logicalId),
    );
    expect(roleId).toBeDefined();
    const role = template.findResources('AWS::IAM::Role')[roleId!];
    const trustStatements = role.Properties?.AssumeRolePolicyDocument?.Statement ?? [];
    expect(
      trustStatements.some(
        (statement: Record<string, unknown>) =>
          (statement.Principal as { Service?: string } | undefined)?.Service ===
          'lambda.amazonaws.com',
      ),
    ).toBe(true);

    const attachedPolicies = Object.values(template.findResources('AWS::IAM::Policy')).filter(
      (policy) =>
        (policy.Properties?.Roles ?? []).some((roleRef: unknown) => references(roleRef, roleId!)),
    );
    const statements = attachedPolicies.flatMap((policy) =>
      policyStatements(policy.Properties?.PolicyDocument),
    );
    const allowStatements = statements.filter((statement) => statement.Effect === 'Allow');
    const actions = policyActions({
      Statement: statements,
    });
    expect(allowStatements.length).toBeGreaterThan(0);
    expect(actions).toContain('dynamodb:GetItem');
    expect(actions).toContain('sqs:SendMessage');
    expect(statements.every((statement) => statement.NotAction === undefined)).toBe(true);

    const forbidden =
      /^(?:\*|cloudtrail:|(?:dynamodb|kms|sqs|s3|iam|cloudformation|sts|codepipeline|codedeploy):\*|s3:(?:Delete|PutBucketPolicy|PutLifecycleConfiguration|PutObjectRetention|PutObjectLegalHold))/i;
    expect(actions.filter((action) => forbidden.test(action))).toEqual([]);

    const deliveryActions = /^(iam:|cloudformation:|sts:AssumeRole|codepipeline:|codedeploy:)/i;
    expect(actions.filter((action) => deliveryActions.test(action))).toEqual([]);

    for (const statement of allowStatements) {
      expect(statement.Resource).toBeDefined();
      const serializedResources = JSON.stringify(statement.Resource);
      expect(serializedResources).not.toContain('"*"');
    }
    const allResourceTargets = JSON.stringify(
      allowStatements.map((statement) => statement.Resource),
    );
    expect(allResourceTargets).toContain('EventsTable');
    expect(allResourceTargets).toContain('OutboxTable');
    expect(allResourceTargets).toContain('DataKey');
    expect(allResourceTargets).toContain('AlertQueue');

    const managedPolicyArns = role.Properties?.ManagedPolicyArns ?? [];
    expect(managedPolicyArns).toHaveLength(1);
    expect(JSON.stringify(managedPolicyArns[0])).toContain(
      'service-role/AWSLambdaBasicExecutionRole',
    );
  });

  it('documents provider inputs and clearly leaves provider enforcement pending', () => {
    const documentation = readFileSync(
      resolve(process.cwd(), 'docs/telemetry-delivery-controls.md'),
      'utf8',
    );
    for (const requirement of [
      'repository/CI provider',
      'repository identifier',
      'protected refs and environments',
      'OIDC issuer',
      'subject',
      'audience',
      'staging and production AWS account IDs',
      'NOT implemented or verified',
    ]) {
      expect(documentation).toContain(requirement);
    }
  });
});
