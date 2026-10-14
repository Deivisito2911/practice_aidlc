import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';

/** Account-level audit resources are deployed by the audit administrator, not the app pipeline. */
export class TelemetryAuditStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const auditKey = new kms.Key(this, 'AuditKey', {
      alias: 'alias/telemetry-audit',
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    const auditBucket = new s3.Bucket(this, 'AuditBucket', {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: auditKey,
      versioned: true,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      objectLockEnabled: true,
      objectLockDefaultRetention: s3.ObjectLockRetention.compliance(cdk.Duration.days(90)),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    const trailName = 'telemetry-audit';
    const trailArn = this.formatArn({
      service: 'cloudtrail',
      resource: 'trail',
      resourceName: trailName,
      arnFormat: cdk.ArnFormat.SLASH_RESOURCE_NAME,
    });
    auditKey.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: [new iam.ServicePrincipal('cloudtrail.amazonaws.com')],
        actions: ['kms:GenerateDataKey*'],
        resources: ['*'],
        conditions: {
          StringEquals: { 'aws:SourceArn': trailArn },
          StringLike: { 'kms:EncryptionContext:aws:cloudtrail:arn': trailArn },
        },
      }),
    );
    auditKey.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: [new iam.ServicePrincipal('cloudtrail.amazonaws.com')],
        actions: ['kms:DescribeKey'],
        resources: ['*'],
        conditions: { StringEquals: { 'aws:SourceArn': trailArn } },
      }),
    );
    const trail = new cloudtrail.Trail(this, 'AuditTrail', {
      trailName,
      bucket: auditBucket,
      encryptionKey: auditKey,
      isMultiRegionTrail: true,
      includeGlobalServiceEvents: true,
    });
    trail.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);
    const handlers = (['staging', 'production'] as const).map((stage) =>
      lambda.Function.fromFunctionName(
        this,
        `Telemetry${stage}Handler`,
        `telemetry-${stage}-handler`,
      ),
    );
    trail.addLambdaEventSelector(handlers, { readWriteType: cloudtrail.ReadWriteType.ALL });
  }
}
