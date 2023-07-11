export type IKV = Record<string, string>;

export type ICodeUri = string | {
  src?: string;
  ossBucketName?: string;
  ossObjectName?: string;
}
