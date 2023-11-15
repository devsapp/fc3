import { IInputs as _IInputs, ICredentials } from '@serverless-devs/component-interface';
import { IFunction } from './function';
import { ITrigger } from './trigger';
import { IRegion } from './region';
import { IAsyncInvokeConfig } from './async_invoke_config';

export * from './region';
export * from './function';
export * from './trigger';
export * from './base';
export * from './async_invoke_config';

export interface IProps extends IFunction {
  region: IRegion;
  triggers?: ITrigger[];
  asyncInvokeConfig?: IAsyncInvokeConfig;
  endpoint?: string;
}

export interface IInputs extends _IInputs {
  props: IProps;
  baseDir: string;
  credential?: ICredentials;
  userAgent?: string;
}
