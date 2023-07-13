import { IKV, ICodeUri } from './base';

export enum Runtime {
  'nodejs10' = 'nodejs10',
  'nodejs12' = 'nodejs12',
  'nodejs14' = 'nodejs14',
  'nodejs16' = 'nodejs16',
  'python3.10' = 'python3.10',
  'python3.9' = 'python3.9',
  'python3' = 'python3',
  'python2.7' = 'python2.7',
  'java11' = 'java11',
  'java8' = 'java8',
  'go1' = 'go1',
  'php7.2' = 'php7.2',
  'dotnetcore3.1' = 'dotnetcore3.1',
  'dotnetcore2.1' = 'dotnetcore2.1',
  'custom.debian10' = 'custom.debian10',
  'custom' = 'custom',
  'custom-container' = 'custom-container',
}

export const RuntimeList = Object.values(Runtime);

export type IRuntime = `${Runtime}`;

export interface ILifecycleHook {
  handler?: string;
  timeout?: number;
}

export interface IHealthCheckConfig {
  failureThreshold?: number;
  httpGetUrl?: string;
  initialDelaySeconds?: number;
  periodSeconds?: number;
  successThreshold?: number;
  timeoutSeconds?: number;
}

export interface ICustomContainerConfig {
  accelerationType?: string; // ?
  acrInstanceID?: string;
  command?: string[];
  entrypoint?: string[];
  healthCheckConfig?: IHealthCheckConfig;
  image?: string;
  port?: number;
}

export interface ICustomRuntimeConfig {
  args?: string[];
  command?: string[];
  healthCheckConfig?: IHealthCheckConfig;
  port?: number;
}

export interface ICustomDNS {
  searches?: string[];
  nameServers?: string[];
  dnsOptions?: { name: string; value: string }[];
}

export interface IGpuConfig {
  gpuMemorySize?: number;
  gpuType?: string;
}

export interface ILogConfig {
  project: string;
  logstore: string;
  enableInstanceMetrics?: boolean;
  enableRequestMetrics?: boolean;
  logBeginRule?: 'DefaultRegex' | 'None';
}

export interface INasConfig {
  userId?: number;
  groupId?: number;
  mountPoints: {
    enableTLS?: boolean;
    serverAddr: string;
    mountDir: string;
  }[];
}

export interface IOssMountConfig {
  mountPoints: {
    bucketName: string;
    bucketPath: string;
    endpoint: string;
    mountDir: string;
    readOnly?: boolean;
  }[];
}

export interface ITracingConfig {
  jaegerConfig?: {
    endpoint: string;
  };
  params?: string;
  type?: string;
}

export interface IVpcConfig {
  securityGroupId: string;
  vSwitchIds: string[];
  vpcId: string;
}

export interface IFunction {
  functionName: string;
  runtime: IRuntime;
  handler?: string;
  codeUri?: ICodeUri;
  description?: string;
  diskSize?: 512 | 10240;
  internetAccess?: boolean;
  layers?: string[];
  cpu?: number;
  memorySize?: number;
  timeout?: number;

  logConfig?: 'auto' | ILogConfig;
  nasConfig?: 'auto' | INasConfig;
  ossMountConfig?: IOssMountConfig;
  role?: 'auto' | string;
  vpcConfig?: 'auto' | IVpcConfig;
  vpcBinding?: {
    vpcIds: string[];
  };

  customContainerConfig?: ICustomContainerConfig;
  customDNS?: ICustomDNS;
  customRuntimeConfig?: ICustomRuntimeConfig;
  environmentVariables?: IKV;
  gpuConfig?: IGpuConfig;
  tracingConfig?: ITracingConfig;
  instanceLifecycleConfig?: {
    initializer: ILifecycleHook;
    preStop: ILifecycleHook;
  };
}
