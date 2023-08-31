export interface IDestination {
  destination?: string;
}
export interface IDestinationConfig {
  onFailure?: IDestination;
  onSuccess?: IDestination;
}

export interface IAsyncInvokeConfig {
  destinationConfig?: IDestinationConfig;
  maxAsyncEventAgeInSeconds?: number;
  maxAsyncRetryAttempts?: number;
}
