import { IInputs as _IInputs } from '@serverless-devs/component-interface'

export interface ICodeUri {
  src?: string;
  bucket?: string;
  object?: string;
  // excludes?: string[];
  // includes?: string[];
}

export interface IProps {

}

export interface IInputs extends _IInputs {
  props: IProps;
}
