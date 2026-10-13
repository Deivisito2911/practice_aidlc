import * as cdk from 'aws-cdk-lib';
import { TelemetryStack } from '../infra/telemetry-stack.js';

const app = new cdk.App();
const stage = app.node.tryGetContext('stage') === 'production' ? 'production' : 'staging';
new TelemetryStack(app, `Telemetry-${stage}`, {
  stage,
  operatorRoleArn:
    process.env.TELEMETRY_OPERATOR_ROLE_ARN ?? app.node.tryGetContext('operatorRoleArn'),
  alarmTopicArn: process.env.TELEMETRY_ALARM_TOPIC_ARN ?? app.node.tryGetContext('alarmTopicArn'),
});
