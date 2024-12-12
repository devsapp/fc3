export interface IProvision {
  alwaysAllocateCPU?: boolean;
  alwaysAllocateGPU?: boolean;
  scheduledActions?: IProvisionScheduledAction[];
  targetTrackingPolicies?: IProvisionTargetTrackingPolicy[];
  target?: number;
  defaultTarget?: number;
}

export interface IProvisionScheduledAction {
  endTime?: string;
  name?: string;
  scheduleExpression?: string;
  startTime?: string;
  target?: number;
}

export interface IProvisionTargetTrackingPolicy {
  endTime?: string;
  maxCapacity?: number;
  metricTarget?: number;
  metricType?: string;
  minCapacity?: number;
  name?: string;
  startTime?: string;
}
