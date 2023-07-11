import { IInputs as _IInputs } from '@serverless-devs/component-interface';
import IFunction from './function';
import ITrigger from './trigger';
import IRegion from './region';

export * from './function';
export * from './region';
export * from './trigger';


export interface IProps {
  region: IRegion;
  function: IFunction;
  triggers?: ITrigger[];
}

export interface IInputs extends _IInputs {
  props: IProps;
}
