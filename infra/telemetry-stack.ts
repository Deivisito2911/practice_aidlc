import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';

export interface TelemetryStackProps extends cdk.StackProps {
  stage: 'staging' | 'production';
}
export class TelemetryStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: TelemetryStackProps) {
    super(scope, id, props);
    const prefix = `telemetry-${props.stage}`;
    const key = new kms.Key(this, 'DataKey', {
      alias: `alias/${prefix}`,
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    const dlq = new sqs.Queue(this, 'InputDlq', {
      queueName: `${prefix}-input-dlq`,
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: key,
      retentionPeriod: cdk.Duration.days(14),
    });
    const input = new sqs.Queue(this, 'InputQueue', {
      queueName: `${prefix}-input`,
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: key,
      visibilityTimeout: cdk.Duration.seconds(90),
      deadLetterQueue: { queue: dlq, maxReceiveCount: 5 },
    });
    const alerts = new sqs.Queue(this, 'AlertQueue', {
      queueName: `${prefix}-alerts`,
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: key,
    });
    const eventsTable = new dynamodb.Table(this, 'EventsTable', {
      tableName: `${prefix}-events`,
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: key,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    const outboxTable = new dynamodb.Table(this, 'OutboxTable', {
      tableName: `${prefix}-outbox`,
      partitionKey: { name: 'alertId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: key,
      pointInTimeRecovery: true,
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    outboxTable.addGlobalSecondaryIndex({
      indexName: 'PendingByTime',
      partitionKey: { name: 'pendingBucket', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'nextAttemptAt', type: dynamodb.AttributeType.STRING },
    });
    const lambdaProps = {
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'src/telemetry/handlers.ts',
      bundling: { minify: true, externalModules: [] },
      logRetention: logs.RetentionDays.THREE_MONTHS,
      environment: {
        EVENTS_TABLE: eventsTable.tableName,
        OUTBOX_TABLE: outboxTable.tableName,
        INPUT_QUEUE_URL: input.queueUrl,
        ALERT_QUEUE_URL: alerts.queueUrl,
      },
    };
    const ingest = new nodejs.NodejsFunction(this, 'Ingest', {
      ...lambdaProps,
      functionName: `${prefix}-ingest`,
      handler: 'ingestHandler',
      timeout: cdk.Duration.seconds(10),
    });
    const processor = new nodejs.NodejsFunction(this, 'Processor', {
      ...lambdaProps,
      functionName: `${prefix}-processor`,
      handler: 'processHandler',
      timeout: cdk.Duration.seconds(30),
    });
    const publisher = new nodejs.NodejsFunction(this, 'Publisher', {
      ...lambdaProps,
      functionName: `${prefix}-publisher`,
      handler: 'publishHandler',
      timeout: cdk.Duration.seconds(30),
    });
    input.grantSendMessages(ingest);
    input.grantConsumeMessages(processor);
    alerts.grantSendMessages(publisher);
    eventsTable.grantReadWriteData(processor);
    outboxTable.grantReadWriteData(processor);
    outboxTable.grantReadWriteData(publisher);
    // TransactWriteItems is not included in all grantReadWriteData implementations.
    processor.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:TransactWriteItems'],
        resources: [eventsTable.tableArn, outboxTable.tableArn],
      }),
    );
    processor.addEventSource(
      new sources.SqsEventSource(input, { batchSize: 10, reportBatchItemFailures: true }),
    );
    publisher.addEventSource(
      new sources.DynamoEventSource(outboxTable, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 10,
        retryAttempts: 3,
      }),
    );
    new events.Rule(this, 'PendingSweep', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      targets: [new targets.LambdaFunction(publisher)],
    });
    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${prefix}-api`,
      deployOptions: { metricsEnabled: true, loggingLevel: apigateway.MethodLoggingLevel.ERROR },
    });
    api.root
      .addResource('telemetry-events')
      .addMethod('POST', new apigateway.LambdaIntegration(ingest), { apiKeyRequired: true });
    const plan = api.addUsagePlan('UsagePlan', {
      name: `${prefix}-usage`,
      throttle: { rateLimit: 100, burstLimit: 200 },
      quota: { limit: 5000000, period: apigateway.Period.DAY },
    });
    plan.addApiStage({ stage: api.deploymentStage });
    const apiKey = api.addApiKey('ClientKey');
    plan.addApiKey(apiKey);
    const auditBucket = new s3.Bucket(this, 'AuditBucket', {
      bucketName: undefined,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: key,
      versioned: true,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      objectLockEnabled: true,
      objectLockDefaultRetention: s3.ObjectLockRetention.compliance(cdk.Duration.days(90)),
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    new cloudtrail.Trail(this, 'AuditTrail', {
      bucket: auditBucket,
      encryptionKey: key,
      isMultiRegionTrail: true,
      includeGlobalServiceEvents: true,
    });
    new cloudwatch.Alarm(this, 'DlqAlarm', {
      metric: dlq.metricApproximateNumberOfMessagesVisible({ period: cdk.Duration.minutes(1) }),
      threshold: 0,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });
    new cloudwatch.Alarm(this, 'InputAgeAlarm', {
      metric: input.metricApproximateAgeOfOldestMessage({ period: cdk.Duration.minutes(1) }),
      threshold: 30,
      evaluationPeriods: 5,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });
    new cloudwatch.Alarm(this, 'IngestErrorAlarm', {
      metric: ingest.metricErrors({ period: cdk.Duration.minutes(1) }),
      threshold: 0,
      evaluationPeriods: 5,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.urlForPath('/telemetry-events') });
  }
}
