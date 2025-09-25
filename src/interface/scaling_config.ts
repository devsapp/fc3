export interface ScalingPolicy {
  endTime?: string;
  maxInstances?: number;
  metricTarget?: number;
  metricType?: string;
  minInstances?: number;
  name?: string;
  startTime?: string;
  timeZone?: string;
}

export interface ScheduledPolicy {
  endTime?: string;
  name?: string;
  scheduleExpression?: string;
  startTime?: string;
  target?: number;
  timeZone?: string;
}

export interface IScalingConfig {
  horizontalScalingPolicies?: ScalingPolicy[];
  minInstances?: number;
  residentPoolId?: string;
  scheduledPolicies?: ScheduledPolicy[];
}
