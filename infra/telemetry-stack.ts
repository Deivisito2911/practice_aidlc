import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';

export interface TelemetryStackProps extends cdk.StackProps {
  stage: 'staging' | 'production';
  operatorRoleArn?: string;
  alarmTopicArn?: string;
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
    const alerts = new sqs.Queue(this, 'AlertQueue', {
      queueName: `${prefix}-alerts`,
      encryption: sqs.QueueEncryption.KMS,
      enforceSSL: true,
      encryptionMasterKey: key,
      retentionPeriod: cdk.Duration.days(14),
      visibilityTimeout: cdk.Duration.seconds(60),
    });
    const eventsTable = new dynamodb.Table(this, 'EventsTable', {
      tableName: `${prefix}-events`,
      partitionKey: { name: 'eventId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: key,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    eventsTable.addGlobalSecondaryIndex({
      indexName: 'TtlByShard',
      partitionKey: { name: 'ttlShard', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'expiresAt', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.INCLUDE,
      nonKeyAttributes: ['eventId'],
    });
    const outboxTable = new dynamodb.Table(this, 'OutboxTable', {
      tableName: `${prefix}-outbox`,
      partitionKey: { name: 'alertId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: key,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    outboxTable.addGlobalSecondaryIndex({
      indexName: 'DueByShard',
      partitionKey: { name: 'dueShard', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'nextAttemptAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const handlerLogGroup = new logs.LogGroup(this, 'HandlerLogGroup', {
      logGroupName: `/aws/lambda/${prefix}-handler`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    const telemetry = new nodejs.NodejsFunction(this, 'TelemetryHandler', {
      functionName: `${prefix}-handler`,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: 'src/telemetry/handlers.ts',
      handler: 'telemetryHandler',
      memorySize: 512,
      timeout: cdk.Duration.seconds(20),
      logGroup: handlerLogGroup,
      bundling: { minify: true, externalModules: [] },
      environment: {
        EVENTS_TABLE: eventsTable.tableName,
        OUTBOX_TABLE: outboxTable.tableName,
        ALERT_QUEUE_URL: alerts.queueUrl,
        ALERT_SEND_BUDGET_MS: '150',
        OUTBOX_BATCH_SIZE: '25',
        OUTBOX_LEASE_SECONDS: '30',
        OUTBOX_MAX_BACKOFF_MINUTES: '15',
        OUTBOX_TTL_BATCH_SIZE: '25',
        TELEMETRY_OPERATOR_MAX_BATCH: '25',
      },
    });
    eventsTable.grant(
      telemetry,
      'dynamodb:GetItem',
      'dynamodb:PutItem',
      'dynamodb:UpdateItem',
      'dynamodb:Scan',
    );
    outboxTable.grant(telemetry, 'dynamodb:PutItem', 'dynamodb:UpdateItem');
    telemetry.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:Query'],
        resources: [`${outboxTable.tableArn}/index/DueByShard`],
      }),
    );
    key.grantEncryptDecrypt(telemetry);
    alerts.grantSendMessages(telemetry);
    if (props.operatorRoleArn) {
      const operatorRole = iam.Role.fromRoleArn(
        this,
        'TelemetryOperatorRole',
        props.operatorRoleArn,
        { mutable: true },
      );
      operatorRole.addToPrincipalPolicy(
        new iam.PolicyStatement({
          actions: ['lambda:InvokeFunction'],
          resources: [telemetry.functionArn],
        }),
      );
    }

    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${prefix}-api`,
      deployOptions: {
        metricsEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.ERROR,
      },
    });
    api.root
      .addResource('telemetry-events')
      .addMethod('POST', new apigateway.LambdaIntegration(telemetry), { apiKeyRequired: true });
    const plan = api.addUsagePlan('UsagePlan', {
      name: `${prefix}-usage`,
      throttle: { rateLimit: 100, burstLimit: 200 },
      quota: { limit: 5_000_000, period: apigateway.Period.DAY },
    });
    plan.addApiStage({ api, stage: api.deploymentStage });
    plan.addApiKey(api.addApiKey('ClientKey'));
    new events.Rule(this, 'PendingRecovery', {
      ruleName: `${prefix}-pending-recovery`,
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      targets: [new targets.LambdaFunction(telemetry)],
    });

    const auditBucket = new s3.Bucket(this, 'AuditBucket', {
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
    const requestCount = new cloudwatch.Metric({
      namespace: 'VehicleTelemetry',
      metricName: 'HttpRequests',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });
    const serviceErrorCount = new cloudwatch.Metric({
      namespace: 'VehicleTelemetry',
      metricName: 'HttpServiceErrors',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });
    const serviceErrorRate = new cloudwatch.MathExpression({
      expression: 'IF(requests >= 100, 100 * errors / requests, 0)',
      usingMetrics: { requests: requestCount, errors: serviceErrorCount },
      period: cdk.Duration.minutes(5),
    });
    const handlerErrorsAlarm = new cloudwatch.Alarm(this, 'HandlerErrorsAlarm', {
      metric: serviceErrorRate,
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });
    const pendingCount = new cloudwatch.Metric({
      namespace: 'VehicleTelemetry',
      metricName: 'OutboxPendingCount',
      statistic: 'Maximum',
      period: cdk.Duration.minutes(1),
    });
    const pendingAge = new cloudwatch.Metric({
      namespace: 'VehicleTelemetry',
      metricName: 'OutboxOldestPendingAge',
      statistic: 'Maximum',
      period: cdk.Duration.minutes(1),
    });
    const ttlEligible = new cloudwatch.Metric({
      namespace: 'VehicleTelemetry',
      metricName: 'TtlEligibleUndeleted',
      statistic: 'Maximum',
      period: cdk.Duration.hours(1),
    });
    const destinations: cloudwatch.IAlarmAction[] = [];
    if (props.alarmTopicArn) {
      const topic = sns.Topic.fromTopicArn(this, 'OperationsAlarmTopic', props.alarmTopicArn);
      destinations.push(new cloudwatchActions.SnsAction(topic));
    }
    for (const action of destinations) handlerErrorsAlarm.addAlarmAction(action);
    const addAlarm = (
      id: string,
      metric: cloudwatch.IMetric,
      threshold: number,
      periods: number,
    ) => {
      const alarm = new cloudwatch.Alarm(this, id, {
        metric,
        threshold,
        evaluationPeriods: periods,
        comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      for (const action of destinations) alarm.addAlarmAction(action);
    };
    addAlarm('PendingCountAlarm', pendingCount, 100, 10);
    addAlarm('PendingAgeAlarm', pendingAge, 600, 5);
    addAlarm('TtlEligibleAlarm', ttlEligible, 1000, 1);
    const alertQueueAgeAlarm = new cloudwatch.Alarm(this, 'AlertQueueAgeAlarm', {
      metric: alerts.metricApproximateAgeOfOldestMessage({ period: cdk.Duration.minutes(1) }),
      threshold: 300,
      evaluationPeriods: 5,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });
    for (const action of destinations) alertQueueAgeAlarm.addAlarmAction(action);
    addAlarm(
      'AlertQueueDepthAlarm',
      alerts.metricApproximateNumberOfMessagesVisible({
        period: cdk.Duration.minutes(1),
        statistic: 'Maximum',
      }),
      100,
      5,
    );
    const eventRuleMetric = new cloudwatch.Metric({
      namespace: 'AWS/Events',
      metricName: 'FailedInvocations',
      dimensionsMap: { RuleName: `${prefix}-pending-recovery` },
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });
    addAlarm('EventBridgeFailuresAlarm', eventRuleMetric, 0, 1);
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.urlForPath('/telemetry-events') });
    new cdk.CfnOutput(this, 'TelemetryFunctionArn', { value: telemetry.functionArn });
  }
}
