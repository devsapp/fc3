export interface ScheduledAction {
  name: string;
  startTime: string;
  endTime: string;
  target: number;
  scheduleExpression: string;
  timeZone: string;
}

export interface TargetTrackingPolicy {
  name: string;
  startTime: string;
  endTime: string;
  metricType: string;
  metricTarget: number;
  minCapacity: number;
  maxCapacity: number;
  timeZone: string;
}

export interface IProvisionConfig {
  defaultTarget: number;
  alwaysAllocateCPU: boolean;
  alwaysAllocateGPU: boolean;
  scheduledActions: ScheduledAction[];
  targetTrackingPolicies: TargetTrackingPolicy[];
}
