import { Protocol, TriggerType } from './base';

export type IProtocol = `${Protocol}`;

export interface IRoutesItem {
  path: string;
  // accountId?: string;
  functionName?: string;
  methods?: `${TriggerType}`[];
  qualifier?: string;
  rewriteConfig?: IRewriteConfig[];
}

export interface IRewriteItem {
  match: string;
  replacement: string;
}

export interface IAuthConfig {
  authInfo?: string;
  authType: 'jwt' | 'function' | 'anonymous';
}

export interface ICertConfig {
  certName: string;
  certificate: string;
  privateKey: string;
}

export interface ITlsConfig {
  cipherSuites?: string[];
  maxVersion?: string;
  minVersion?: string;
}

export interface IRewriteConfig {
  equalRules?: IRewriteItem[];
  regexRules?: IRewriteItem[];
  wildcardRules?: IRewriteItem[];
}

export interface IRouteConfig {
  routes: IRoutesItem[];
}

export interface IDomain {
  domainName: string;
  protocol: IProtocol;
  routeConfig: IRouteConfig;
  authConfig?: IAuthConfig;
  certConfig?: ICertConfig;
  tlsConfig?: ITlsConfig;
  wafConfig?: {
    enableWAF: boolean;
  };
}
