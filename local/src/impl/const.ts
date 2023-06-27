import { isDebugMode } from '@serverless-devs/core';

export const isDebug = isDebugMode() || false;
export const defaultFcDockerVersion = '3.0.0';

export const IDE_VSCODE: string = 'vscode';
export const IDE_INTELLIJ: string = 'intellij';
