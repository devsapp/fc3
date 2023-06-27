import { InputProps } from './interface';
import { ImageBuiltKitBuilder } from './imageBuiltKitBuilder';
import { ImageDockerBuilder } from './imageDockerBuilder';
import { ImageKanikoBuilder } from './imageKanikoBuilder';
import { DefaultBuilder } from './defaultBuilder';
import { BuildType } from './enum';
import logger from '../common/logger';
import { Builder } from './baseBuilder';

export class BuilderFactory {
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
