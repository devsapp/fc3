import { IInputs as _IInputs, ICredentials } from '@serverless-devs/component-interface';

export interface RunitInput extends _IInputs {
  region: string;
  credential: ICredentials;
  props: IProps;
  userAgent: string;
  baseDir: string;
}

interface IProps {
  region: string;
  build: {
    setup: string;
    code: string;
    timeout: number;
    buildSpec: string;
    exclude: string[];
  },
  runtime: {
    registry: string;
    image: string;
    tag?: string;
    username: string;
    password: string;
    command?: string[];
    port?: number;
    environmentVariables?: Record<string, string>; 
  };
}