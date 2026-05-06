import { IInputs } from '../../interface';

import { ImageBuiltKitBuilder } from './impl/imageBuiltKitBuilder';
import { ImageDockerBuilder } from './impl/imageDockerBuilder';
import { ImageKanikoBuilder } from './impl/imageKanikoBuilder';
import { DefaultBuilder } from './impl/defaultBuilder';
import { Builder } from './impl/baseBuilder';
import { parseArgv } from '@serverless-devs/utils';
import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { yellow } from 'chalk';

import logger from '../../logger';
import Runit from './runit';
import { IProps as RunitProps } from './runit/interface';

export enum BuildType {
  ImageDocker = 'IAMGE_BULD_DOCKER',
  ImageBuildKit = 'IAMGE_BULD_KIT',
  ImageKaniko = 'IMAGE_BUILD_KANIKO',
  Default = 'DEFAULT',
}

export default class BuilderFactory {
  private inputs: IInputs;
  private debugInstance: boolean;
  cloudBuildYamlPath: string;
  private cloudBuildYamlAbsPath: string | null;

  constructor(inputs: IInputs) {
    this.inputs = inputs;
    const opts = parseArgv(inputs.args, {
      alias: { help: 'h', 'assume-yes': 'y' },
      boolean: ['help', 'debug-instance'],
      string: ['cloud-build-config'],
    });
    const { 'debug-instance': debugInstance, 'cloud-build-config': cloudBuildConfig } = opts;
    this.debugInstance = debugInstance;
    this.cloudBuildYamlPath = cloudBuildConfig;
    this.cloudBuildYamlAbsPath = null;
  }

  findCloudBuildYaml(): string | null {
    if (this.cloudBuildYamlPath) {
      const absolutePath = path.isAbsolute(this.cloudBuildYamlPath)
        ? this.cloudBuildYamlPath
        : path.resolve(this.cloudBuildYamlPath);

      if (!fs.existsSync(absolutePath)) {
        logger.error(`User-specified config not found: ${absolutePath}`);
        throw new Error(`Cloud build config not found: ${absolutePath}`);
      }

      logger.debug(`Using user-specified config: ${absolutePath}`);
      this.cloudBuildYamlAbsPath = absolutePath;
      return absolutePath;
    }

    const defaultPath = path.join(process.cwd(), 'fc3-cloud-build.yaml');
    if (fs.existsSync(defaultPath)) {
      logger.debug(`Found fc3-cloud-build.yaml in current directory: ${defaultPath}`);
      this.cloudBuildYamlAbsPath = defaultPath;
      return defaultPath;
    }

    logger.debug('fc3-cloud-build.yaml not found');
    return null;
  }

  async runit() {
    const buildYamlPath = this.cloudBuildYamlAbsPath;

    try {
      const buildYamlContent = fs.readFileSync(buildYamlPath, 'utf8');
      const buildConfig = yaml.load(buildYamlContent) as any;

      // 从build.yaml中提取配置，支持多种格式
      let config = buildConfig;
      if (buildConfig && typeof buildConfig === 'object') {
        const keys = Object.keys(buildConfig);

        const firstKey = keys[0];
        const firstValue = buildConfig[firstKey];

        if (firstValue && typeof firstValue === 'object' && 'props' in firstValue) {
          config = firstValue.props;
        } else if (keys.length === 1 || keys.includes('default')) {
          const targetKey = keys.includes('default') ? 'default' : firstKey;
          const extractedConfig = buildConfig[targetKey];
          config =
            extractedConfig && 'props' in extractedConfig ? extractedConfig.props : extractedConfig;
        }
      }
      logger.debug(`Extracted config: ${JSON.stringify(config, null, 2)}`);

      const credential = await this.inputs.getCredential();

      const runitInputs = {
        ...this.inputs,
        region: this.inputs.props.region,
        credential,
        props: config as RunitProps,
        userAgent: this.inputs.userAgent || '',
      };

      logger.debug(`RunitInputs: ${JSON.stringify(runitInputs, null, 2)}`);
      const runit = new Runit(runitInputs);
      const result = await runit.deploy(this.debugInstance);

      logger.write(yellow(`Please replace customContainerConfig.image: ${result.image}`));
      return result;
    } catch (error) {
      logger.error(`Failed to execute runit: ${error.message}`);
      throw error;
    }
  }

  public static getBuilder(buildType: BuildType, inputs: IInputs): Builder {
    switch (buildType) {
      case BuildType.ImageDocker:
        return new ImageDockerBuilder(inputs);
      case BuildType.ImageBuildKit:
        return new ImageBuiltKitBuilder(inputs);
      case BuildType.ImageKaniko:
        return new ImageKanikoBuilder(inputs);
      case BuildType.Default:
        return new DefaultBuilder(inputs);
      default:
        logger.error(`Invalid buildType ${buildType}`);
        throw new Error(`Invalid buildType ${buildType}`);
    }
  }
}
