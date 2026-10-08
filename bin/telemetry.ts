import * as cdk from 'aws-cdk-lib';
import { TelemetryStack } from '../infra/telemetry-stack.js';

const app = new cdk.App();
const stage = app.node.tryGetContext('stage') === 'production' ? 'production' : 'staging';
new TelemetryStack(app, `Telemetry-${stage}`, { stage });
