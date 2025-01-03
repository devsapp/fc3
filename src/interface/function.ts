import { IKV, ICodeUri, Runtime } from './base';

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

export interface IAuthConfig {
  userName?: string;
  password?: string;
}

export interface ICertConfig {
  insecure?: boolean;
  rootCaCertBase64?: string;
}

export interface INetworkConfig {
  vpcId?: string;
  vSwitchId?: string;
  securityGroupId?: string;
}

export interface IRegistryConfig {
  authConfig?: IAuthConfig;
  certConfig?: ICertConfig;
  networkConfig?: INetworkConfig;
}

export interface ICustomContainerConfig {
  command?: string[];
  entrypoint?: string[];
  healthCheckConfig?: IHealthCheckConfig;
  image?: string;
  port?: number;
  registryConfig?: IRegistryConfig;
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
  dnsOptions?: Array<{ name: string; value: string }>;
}

export interface IGpuConfig {
  gpuMemorySize?: number;
  gpuType?: 'fc.gpu.tesla.1' | 'fc.gpu.ampere.1';
}

export interface ILogConfig {
  project: string;
  logstore: string;
  enableInstanceMetrics?: boolean;
  enableRequestMetrics?: boolean;
  logBeginRule?: 'DefaultRegex' | 'None';
}

export interface INasConfig {
  userId: number;
  groupId: number;
  mountPoints: Array<{
    enableTLS?: boolean;
    serverAddr: string;
    mountDir: string;
  }>;
}

export interface IOssMountConfig {
  mountPoints: Array<{
    bucketName: string;
    bucketPath?: string;
    endpoint: string;
    mountDir: string;
    readOnly?: boolean;
  }>;
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
  vSwitchIds: string[] | 'auto';
  vpcId: string;
}

export interface IFunction {
  functionName: string;
  runtime: IRuntime;
  handler?: string;
  code?: ICodeUri;
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
    initializer?: ILifecycleHook;
    preStop?: ILifecycleHook;
  };

  annotaions?: {
    headers?: {
      [key: string]: string;
    };
  };
}
