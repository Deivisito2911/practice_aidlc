import { describe, expect, it } from 'vitest';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TelemetryStack } from './telemetry-stack.js';
import { TelemetryAuditStack } from './telemetry-audit-stack.js';

const app = new cdk.App();
const template = Template.fromStack(
  new TelemetryStack(app, 'DeliveryControls-test', { stage: 'staging' }),
);
const auditTemplate = Template.fromStack(new TelemetryAuditStack(new cdk.App(), 'Audit-test'));

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

// CloudFormation usa true/All cuando ambas propiedades se omiten:
// https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cloudtrail-trail-eventselector.html
function coversManagement(selector: Record<string, unknown>): boolean {
  const excluded = selector.ExcludeManagementEventSources ?? [];
  return (
    (selector.IncludeManagementEvents ?? true) === true &&
    (selector.ReadWriteType ?? 'All') === 'All' &&
    Array.isArray(excluded) &&
    excluded.length === 0
  );
}

describe('controles de entrega e auditoría U3', () => {
  it('preserva el walking skeleton con sus recursos y activadores únicos', () => {
    template.resourceCountIs('AWS::Lambda::Function', 1);
    template.resourceCountIs('AWS::DynamoDB::Table', 2);
    template.resourceCountIs('AWS::SQS::Queue', 1);
    template.resourceCountIs('AWS::CloudTrail::Trail', 0);
    template.resourceCountIs('AWS::S3::Bucket', 0);
    auditTemplate.resourceCountIs('AWS::Lambda::Function', 0);

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
    const trails = auditTemplate.findResources('AWS::CloudTrail::Trail');
    expect(Object.keys(trails)).toHaveLength(1);
    const trail = Object.values(trails)[0];
    expect(trail.Properties?.IsLogging).toBe(true);
    expect(trail.Properties?.IncludeGlobalServiceEvents).toBe(true);
    const eventSelectors = trail.Properties?.EventSelectors ?? [];
    expect(
      eventSelectors.length === 0 ||
        eventSelectors.some((selector: Record<string, unknown>) => coversManagement(selector)),
    ).toBe(true);
    const buckets = auditTemplate.findResources('AWS::S3::Bucket');
    const auditBucketId = Object.keys(buckets).find((logicalId) =>
      references(trail.Properties?.S3BucketName, logicalId),
    );
    expect(auditBucketId).toBeDefined();
    const bucket = buckets[auditBucketId!];

    const keys = auditTemplate.findResources('AWS::KMS::Key');
    const auditKeyId = Object.keys(keys).find((id) => references(trail.Properties?.KMSKeyId, id));
    expect(auditKeyId).toBeDefined();
    expect(keys[auditKeyId!].Properties?.KeyUsage).not.toBe('GENERATE_VERIFY_MAC');
    const encryption = bucket.Properties?.BucketEncryption?.ServerSideEncryptionConfiguration;
    expect(
      encryption.some((entry: Record<string, unknown>) => references(entry, auditKeyId!)),
    ).toBe(true);
    const selectorsJson = JSON.stringify(eventSelectors);
    expect(selectorsJson).toContain('telemetry-staging-handler');
    expect(selectorsJson).toContain('telemetry-production-handler');
    const keyStatements = policyStatements(keys[auditKeyId!].Properties?.KeyPolicy);
    expect(
      keyStatements.some(
        (statement) =>
          JSON.stringify(statement.Principal).includes('cloudtrail.amazonaws.com') &&
          policyActions({ Statement: [statement] }).includes('kms:GenerateDataKey*') &&
          JSON.stringify(statement.Condition).includes('kms:EncryptionContext:aws:cloudtrail:arn'),
      ),
    ).toBe(true);
    const serviceStatements = keyStatements.filter(
      (statement) =>
        (statement.Principal as { Service?: string } | undefined)?.Service ===
        'cloudtrail.amazonaws.com',
    );
    expect(serviceStatements).toHaveLength(2);
    const encrypt = serviceStatements.find((statement) =>
      policyActions({ Statement: [statement] }).includes('kms:GenerateDataKey*'),
    )!;
    const describe = serviceStatements.find((statement) =>
      policyActions({ Statement: [statement] }).includes('kms:DescribeKey'),
    )!;
    expect(encrypt.Effect).toBe('Allow');
    expect(describe.Effect).toBe('Allow');
    expect(encrypt.Resource).toBe('*'); // En KeyPolicy identifica solo la clave adjunta.
    expect(describe.Resource).toBe('*');
    const encryptionConditions = encrypt.Condition as Record<string, Record<string, unknown>>;
    const describeConditions = describe.Condition as Record<string, Record<string, unknown>>;
    const sourceArn = encryptionConditions.StringEquals['aws:SourceArn'];
    expect(JSON.stringify(sourceArn)).toContain(trail.Properties?.TrailName);
    expect(JSON.stringify(sourceArn)).toContain('cloudtrail:');
    expect(JSON.stringify(sourceArn)).not.toContain('trail/*');
    expect(encryptionConditions.StringLike['kms:EncryptionContext:aws:cloudtrail:arn']).toEqual(
      sourceArn,
    );
    expect(describeConditions).toEqual({ StringEquals: { 'aws:SourceArn': sourceArn } });
    const trailId = Object.keys(trails)[0];
    expect(references(keys[auditKeyId!].Properties?.KeyPolicy, trailId)).toBe(false);
    expect(references(keys[auditKeyId!].DependsOn, trailId)).toBe(false);
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

    const bucketPolicies = Object.values(
      auditTemplate.findResources('AWS::S3::BucketPolicy'),
    ).filter((policy) => references(policy.Properties?.Bucket, auditBucketId!));
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

  it('rechaza desactivar administración, excluir servicios o registrar solo lectura/escritura', () => {
    expect(coversManagement({})).toBe(true);
    expect(coversManagement({ IncludeManagementEvents: false })).toBe(false);
    expect(coversManagement({ ExcludeManagementEventSources: ['kms.amazonaws.com'] })).toBe(false);
    expect(coversManagement({ ReadWriteType: 'ReadOnly' })).toBe(false);
    expect(coversManagement({ ReadWriteType: 'WriteOnly' })).toBe(false);
  });

  it('separa los permisos efectivos Lambda de administración y borrado de auditoría', () => {
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

  it('comprueba claridad documental y obligaciones externas pendientes, sin probar enforcement', () => {
    const documentation = readFileSync(
      resolve(process.cwd(), 'docs/telemetry-delivery-controls.md'),
      'utf8',
    );
    for (const requirement of [
      'GitHub Actions',
      'identificador del repositorio',
      'entornos protegidos',
      'issuer',
      'subject',
      'audiencia',
      'cuentas AWS',
      'pendientes de aprovisionamiento o verificación externa',
      'CloudFormation, PassRole',
      'gitleaks dir --config .gitleaks.toml --redact=100 --exit-code 1',
      'gitleaks git --config .gitleaks.toml --redact=100 --exit-code 1 --log-opts=--all',
    ]) {
      expect(documentation).toContain(requirement);
    }
  });
});
