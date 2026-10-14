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
import * as logs from 'aws-cdk-lib/aws-logs';
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
    const macKey = new kms.Key(this, 'RecoveryMacKey', {
      keySpec: kms.KeySpec.HMAC_256,
      keyUsage: kms.KeyUsage.GENERATE_VERIFY_MAC,
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
      projectionType: dynamodb.ProjectionType.KEYS_ONLY,
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
        RECOVERY_MAC_KEY_ID: macKey.keyArn,
        RECOVERY_MAC_ALLOWED_KEYS: macKey.keyArn,
        RECOVERY_PREVIEW_TTL_SECONDS: '300',
        RECOVERY_MAX_EXECUTION_MS: '18000',
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
    outboxTable.grant(telemetry, 'dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem');
    telemetry.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:Query'],
        resources: [`${outboxTable.tableArn}/index/DueByShard`],
      }),
    );
    telemetry.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['dynamodb:Query'],
        resources: [`${eventsTable.tableArn}/index/TtlByShard`],
      }),
    );
    telemetry.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['kms:GenerateMac', 'kms:VerifyMac'],
        resources: [macKey.keyArn],
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

    const requestCount = new cloudwatch.Metric({
      namespace: 'VehicleTelemetry',
      dimensionsMap: { Service: 'TelemetryService' },
      unit: cloudwatch.Unit.COUNT,
      metricName: 'HttpEligibleRequests',
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });
    const serviceErrorCount = new cloudwatch.Metric({
      namespace: 'VehicleTelemetry',
      dimensionsMap: { Service: 'TelemetryService' },
      unit: cloudwatch.Unit.COUNT,
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
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      alarmDescription:
        'Alta: >=1% errores entre >=100 solicitudes elegibles; diagnosticar DynamoDB/Lambda/SQS.',
    });
    const pendingCount = new cloudwatch.Metric({
      namespace: 'VehicleTelemetry',
      dimensionsMap: { Service: 'TelemetryService' },
      unit: cloudwatch.Unit.COUNT,
      metricName: 'OutboxPendingCount',
      statistic: 'Maximum',
      period: cdk.Duration.minutes(1),
    });
    const pendingAge = new cloudwatch.Metric({
      namespace: 'VehicleTelemetry',
      dimensionsMap: { Service: 'TelemetryService' },
      unit: cloudwatch.Unit.SECONDS,
      metricName: 'OutboxOldestPendingAge',
      statistic: 'Maximum',
      period: cdk.Duration.minutes(1),
    });
    const ttlEligible = new cloudwatch.Metric({
      namespace: 'VehicleTelemetry',
      dimensionsMap: { Service: 'TelemetryService' },
      unit: cloudwatch.Unit.COUNT,
      metricName: 'TtlEligibleUndeleted',
      statistic: 'Maximum',
      period: cdk.Duration.hours(1),
    });
    const destinations: cloudwatch.IAlarmAction[] = [];
    {
      const topicArn =
        props.alarmTopicArn ??
        new cdk.CfnParameter(this, 'OperationsAlarmTopicArn', {
          type: 'String',
          description: 'ARN del canal de guardia del entorno.',
        }).valueAsString;
      const topic = sns.Topic.fromTopicArn(this, 'OperationsAlarmTopic', topicArn);
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
        alarmDescription: `${id === 'TtlEligibleAlarm' ? 'Baja' : id === 'PendingAgeAlarm' || id === 'EventBridgeFailuresAlarm' ? 'Alta' : 'Media'}; ${id}: revisar señal, permisos y causa; recuperación manual exige preview y confirmación; destino canal de guardia.`,
        comparisonOperator:
          id === 'EventBridgeFailuresAlarm'
            ? cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD
            : cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      for (const action of destinations) alarm.addAlarmAction(action);
    };
    addAlarm('PendingCountAlarm', pendingCount, 100, 10);
    addAlarm('PendingAgeAlarm', pendingAge, 600, 5);
    addAlarm('TtlEligibleAlarm', ttlEligible, 1000, 1);
    const alertQueueAgeAlarm = new cloudwatch.Alarm(this, 'AlertQueueAgeAlarm', {
      alarmDescription:
        'Media; antiguedad SQS: revisar consumidor y publicacion; canal de guardia del entorno.',
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
    addAlarm('EventBridgeFailuresAlarm', eventRuleMetric, 1, 1);
    const ownMetric = (name: string, unit = cloudwatch.Unit.COUNT, statistic = 'Sum') =>
      new cloudwatch.Metric({
        namespace: 'VehicleTelemetry',
        metricName: name,
        dimensionsMap: { Service: 'TelemetryService' },
        unit,
        statistic,
        period: cdk.Duration.minutes(1),
      });
    const dashboard = new cloudwatch.Dashboard(this, 'OperationsDashboard', {
      dashboardName: `${prefix}-operations`,
    });
    dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown:
          'SLI: p95 <= 0.5 Seconds bajo 100 solicitudes validas/s. Durable <30s: Within30s / CommitCreated; resultados inciertos no acreditan durabilidad. Disponibilidad mensual: disponibles / TODOS los minutos UTC calendario; incluye mantenimiento y no observados. Sin mes completo: Unverified. TTL >24h es corte estricto; medidas parciales son limites inferiores, no ausencia demostrada.',
      }),
    );
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'HTTP y latencia p95',
        left: [
          api.metricClientError({ statistic: 'Sum', period: cdk.Duration.minutes(1) }),
          api.metricCount({ statistic: 'Sum', period: cdk.Duration.minutes(1) }),
          ownMetric('HttpRequests'),
          ownMetric('HttpEligibleRequests'),
          ownMetric('HttpClientErrors'),
          ownMetric('HttpQuotaRejected'),
          serviceErrorRate,
        ],
        right: [
          ownMetric('IngestLatency', cloudwatch.Unit.SECONDS, 'p95'),
          ownMetric('ReceiveToCommit', cloudwatch.Unit.SECONDS, 'p95'),
        ],
      }),
    );
    const durable = new cloudwatch.MathExpression({
      expression: 'IF(commits > 0, 100 * within / commits, 0)',
      usingMetrics: {
        commits: ownMetric('DurableCommitCount'),
        within: ownMetric('DurableWithin30s'),
      },
      period: cdk.Duration.minutes(1),
    });
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Durabilidad: sin datos no demuestra SLO',
        left: [
          durable,
          ownMetric('CommitFailed'),
          ownMetric('CommitUncertain'),
          ownMetric('MeasurementInvalid'),
        ],
      }),
    );
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Outbox y TTL: parcial es limite inferior',
        left: [
          pendingCount,
          ttlEligible,
          ownMetric('PendingMeasurementPartial'),
          ownMetric('TtlMeasurementPartial'),
        ],
        right: [pendingAge],
      }),
    );
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Publicacion y recuperacion',
        left: [
          ownMetric('SqsConfirmed'),
          ownMetric('SqsFailed'),
          ownMetric('SqsUncertain'),
          ownMetric('OutboxPublished'),
          ownMetric('ManualConfirmed'),
          ownMetric('ManualFailed'),
          ownMetric('ManualUnprocessed'),
          eventRuleMetric,
          alerts.metricApproximateNumberOfMessagesVisible(),
        ],
      }),
    );
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.urlForPath('/telemetry-events') });
    new cdk.CfnOutput(this, 'TelemetryFunctionArn', { value: telemetry.functionArn });
  }
}
