import { InputProps } from '@serverless-devs/component-interface';

import { ImageBuiltKitBuilder } from './impl/imageBuiltKitBuilder';
import { ImageDockerBuilder } from './impl/imageDockerBuilder';
import { ImageKanikoBuilder } from './impl/imageKanikoBuilder';
import { DefaultBuilder } from './impl/defaultBuilder';
import { Builder } from './impl/baseBuilder';

import logger from '../../logger';

export enum BuildType {
  ImageDocker = 'IAMGE_BULD_DOCKER',
  ImageBuildKit = 'IAMGE_BULD_KIT',
  ImageKaniko = 'IMAGE_BUILD_KANIKO',
  Default = 'DEFAULT',
}

export default class BuilderFactory {
  public static getBuilder(buildType: BuildType, props: InputProps): Builder {
    switch (buildType) {
      case BuildType.ImageDocker:
        return new ImageDockerBuilder(props);
      case BuildType.ImageBuildKit:
        return new ImageBuiltKitBuilder(props);
      case BuildType.ImageKaniko:
        return new ImageKanikoBuilder(props);
      case BuildType.Default:
        return new DefaultBuilder(props);
      default:
        logger.error(`Invalid buildType ${buildType}`);
        throw new Error(`Invalid buildType ${buildType}`);
    }
  }
}
