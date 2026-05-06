import { IInputs as _IInputs, ICredentials } from '@serverless-devs/component-interface';
import { ICustomContainerConfig } from '../../../../interface';

export interface RunitInput extends _IInputs {
  region: string;
  credential: ICredentials;
  props: IProps;
  userAgent: string;
  baseDir: string;
}

export interface IProps {
  region: string;
  build: {
    setup: string;
    code: string;
    timeoutMinutes?: number;
    buildSpec?: string;
    baseContainerConfig?: ICustomContainerConfig;
  };
  runtime: {
    registryMode?: 'oci' | 'fc-registry';
    image: string;
    username?: string;
    password?: string;
    cpu?: string | number;
    memory?: string | number;
  };
}
