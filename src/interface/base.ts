export type IKV = Record<string, string>;

export type ICodeUri =
  | string
  | {
      src: string;
      ossBucketName: string;
      ossObjectName: string;
    };

export enum Protocol {
  HTTP = 'HTTP',
  HTTPS = 'HTTPS',
  'HTTP,HTTPS' = 'HTTP,HTTPS',
}

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

export enum TriggerType {
  oss = 'oss',
  log = 'log',
  timer = 'timer',
  eventbridge = 'eventbridge',
  http = 'http',
  mns_topic = 'mns_topic',
  cdn_events = 'cdn_events',
  tablestore = 'tablestore',
}

export enum Methods {
  HEAD = 'HEAD',
  DELETE = 'DELETE',
  POST = 'POST',
  GET = 'GET',
  OPTIONS = 'OPTIONS',
  PUT = 'PUT',
  PATCH = 'PATCH',
}
