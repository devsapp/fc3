export interface IScaling {
  minInstances?: number;
  horizontalScalingPolicies?: IScalingHorizontalPolicy[];
  scheduledPolicies?: IScalingScheduledPolicy[];
  residentPoolId?: string;
}

export interface IScalingHorizontalPolicy {
  endTime?: string;
  maxInstances?: number;
  metricTarget?: number;
  metricType?: string;
  minInstances?: number;
  name?: string;
  startTime?: string;
  timeZone?: string;
}

export interface IScalingScheduledPolicy {
  endTime?: string;
  name?: string;
  scheduleExpression?: string;
  startTime?: string;
  target?: number;
  timeZone?: string;
}
