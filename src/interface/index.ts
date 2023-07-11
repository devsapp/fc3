import { IInputs as _IInputs } from '@serverless-devs/component-interface';
import IFunction from './function';
import { IRegion } from './region';

export * from './function';
export * from './region';


export interface IProps {
  region: IRegion;
  function: IFunction;
  triggers?: any[];
}

export interface IInputs extends _IInputs {
  props: IProps;
}
