export interface IKV {
  [key: string]: string;
}

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
  'nodejs8' = 'nodejs8',
  'nodejs10' = 'nodejs10',
  'nodejs12' = 'nodejs12',
  'nodejs14' = 'nodejs14',
  'nodejs16' = 'nodejs16',
  'nodejs18' = 'nodejs18',
  'nodejs20' = 'nodejs20',
  'python3.12' = 'python3.12',
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
  'custom.debian11' = 'custom.debian11',
  'custom.debian12' = 'custom.debian12',
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

export enum OSSEvents {
  CREATED_ALL = 'oss:ObjectCreated:*',
  CREATED_PutObject = 'oss:ObjectCreated:PutObject',
  CREATED_PostObject = 'oss:ObjectCreated:PostObject',
  CREATED_CompleteMultipartUpload = 'oss:ObjectCreated:CompleteMultipartUpload',
  CREATED_PutSymlink = 'oss:ObjectCreated:PutSymlink',
  CREATED_CopyObject = 'oss:ObjectCreated:CopyObject',
  CREATED_InitiateMultipartUpload = 'oss:ObjectCreated:InitiateMultipartUpload',
  CREATED_UploadPart = 'oss:ObjectCreated:UploadPart',
  CREATED_UploadPartCopy = 'oss:ObjectCreated:UploadPartCopy',
  CREATED_AppendObject = 'oss:ObjectCreated:AppendObject',
  REMOVED_DeleteObject = 'oss:ObjectRemoved:DeleteObject',
  REMOVED_DeleteObjects = 'oss:ObjectRemoved:DeleteObjects',
  REMOVED_AbortMultipartUpload = 'oss:ObjectRemoved:AbortMultipartUpload',
  MODIFIED_UpdateObjectMeta = 'oss:ObjectModified:UpdateObjectMeta',
}
