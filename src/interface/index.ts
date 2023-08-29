import { IInputs as _IInputs, ICredentials } from '@serverless-devs/component-interface';
import { IFunction } from './function';
import { ITrigger } from './trigger';
import { IRegion } from './region';

export * from './region';
export * from './function';
export * from './trigger';
export * from './base';

export interface IProps {
  region: IRegion;
  function: IFunction;
  triggers?: ITrigger[];
  endpoint?: string;
}

export interface IInputs extends _IInputs {
  props: IProps;
  baseDir: string;
  credential?: ICredentials;
}
