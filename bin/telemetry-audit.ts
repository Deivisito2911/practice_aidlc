import * as cdk from 'aws-cdk-lib';
import { TelemetryAuditStack } from '../infra/telemetry-audit-stack.js';

const app = new cdk.App();
// This account-level stack has no assets and uses the administrator's CLI session.
new TelemetryAuditStack(app, 'TelemetryAudit', {
  synthesizer: new cdk.LegacyStackSynthesizer(),
});
