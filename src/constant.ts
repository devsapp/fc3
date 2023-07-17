import { isDebugMode } from '@serverless-devs/utils';
import path from 'path';

export const isDebug = isDebugMode() || false;
export const defaultFcDockerVersion = '3.0.0';

export const IDE_VSCODE: string = 'vscode';
export const IDE_INTELLIJ: string = 'intellij';

export const SCHEMA_FILE_PATH = path.join(__dirname, 'schema.json');

export enum FC_API_NOT_FOUND_ERROR_CODE {
  FunctionNotFound = 'FunctionNotFound',
}
