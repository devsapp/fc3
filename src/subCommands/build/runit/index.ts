import { RunitInput } from './interface';
import { build } from '@serverless-devs/docker-image-builder';

export default class Runit {
  inputs: RunitInput;

  constructor(inputs: RunitInput) {
    this.inputs = inputs;
  }

  async deploy(debugInstance: boolean) {
    const { registryMode, image, username, password, cpu, memory } = this.inputs.props.runtime;
    const { code: codeUri, setup, timeoutMinutes, baseContainerConfig } = this.inputs.props.build;

    const {
      AccountID: accountId,
      AccessKeyID: accessKeyId,
      AccessKeySecret: accessKeySecret,
    } = this.inputs.credential;

    await build({
      uid: accountId,
      ak: accessKeyId,
      sk: accessKeySecret,
      region: this.inputs.props.region,
      image,
      username,
      password,
      timeoutMinutes,
      registryMode,
      dir: codeUri,
      setupScript: setup,
      enableSsh: debugInstance,
      cpu,
      memory,
      baseImage: baseContainerConfig?.image,
    });

    return {
      image,
    };
  }
}
