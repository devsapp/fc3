import { ICredentials } from '@serverless-devs/component-interface';
import _ from 'lodash';
import { getDockerTmpUser, getAcrEEInstanceID, getAcrImageMeta } from './login';
import { runCommand, checkDockerIsOK, sleep } from '../../utils';
import { IRegion } from '../../interface';
import logger from '../../logger';

export { getDockerTmpUser, mockDockerConfigFile } from './login';

export default class Acr {
  static isAcrRegistry(imageUrl: string) {
    // 定义正则表达式模式
    const pattern =
      /^(([\w-]{3,30}-)?(registry(-vpc)?)?\.([\w-]+)\.cr\.aliyuncs\.com)\/([\w-]+)\/([\w-]+)(:[\w.-]+)?$/;

    // 使用正则表达式进行匹配
    return pattern.test(imageUrl);
  }
  static isAcreeRegistry(imageUrl: string): boolean {
    // 容器镜像企业服务
    if (!this.isAcrRegistry(imageUrl)) {
      return false;
    }
    const registry = _.split(imageUrl, '/')[0];
    const name = _.split(registry, '.')[0];
    return !name.startsWith('registry');
  }

  static isVpcAcrRegistry(imageUrl: string): boolean {
    if (!this.isAcrRegistry(imageUrl)) {
      return false;
    }
    const imageArr = imageUrl.split('/');
    return imageArr[0].includes('registry-vpc');
  }

  static vpcImage2InternetImage(imageUrl: string): string {
    const imageArr = imageUrl.split('/');
    if (Acr.isVpcAcrRegistry(imageUrl)) {
      imageArr[0] = _.replace(imageArr[0], `registry-vpc`, `registry`);
    }
    return imageArr.join('/');
  }

  static async getAcrEEInstanceID(imageUrl: string, credential: ICredentials): Promise<string> {
    const Li = imageUrl.split('.');
    const region = Li[1] as IRegion;
    const t = Li[0];
    /* eslint-disable no-nested-ternary */
    const instanceName = t.endsWith('-registry-vpc')
      ? t.substring(0, t.length - 13)
      : t.endsWith('-registry')
      ? t.substring(0, t.length - 9)
      : '';
    logger.info(`get instanceName=${instanceName} and region=${region} from ${imageUrl}`);
    return await getAcrEEInstanceID(region, credential, instanceName);
  }

  private instanceID: string;
  constructor(private region: IRegion, private credential: ICredentials) {}

  async checkAcr(imageUrl: string): Promise<boolean> {
    const instanceID = await Acr.getAcrEEInstanceID(imageUrl, this.credential);
    this.instanceID = instanceID;
    const image = Acr.vpcImage2InternetImage(imageUrl);
    const isExist = await getAcrImageMeta(this.region, this.credential, image, instanceID);
    logger.debug(`$imageUrl} isExist = ${isExist}`);
    return isExist;
  }
  async pushAcr(imageUrl: string): Promise<void> {
    try {
      checkDockerIsOK();
    } catch (error) {
      logger.error(`skip push image, error=${error.message}`);
    }
    let { instanceID } = this;
    if (!instanceID) {
      instanceID = await Acr.getAcrEEInstanceID(imageUrl, this.credential);
    }
    const image = Acr.vpcImage2InternetImage(imageUrl);
    const { dockerTmpUser, dockerTmpToken } = await getDockerTmpUser(
      this.region,
      this.credential,
      instanceID,
    );
    logger.info(`try to docker push ${image} ...`);
    try {
      if (image !== imageUrl) {
        const commandStr = `docker tag ${imageUrl} ${image}`;
        await runCommand(commandStr, runCommand.showStdout.inherit);
      }
      let dockerCmdStr = `echo ${dockerTmpToken} | docker login ${image} --username ${dockerTmpUser} --password-stdin`;
      if (process.platform === 'win32') {
        dockerCmdStr = `echo|set /p="${dockerTmpToken}" | docker login ${image} --username ${dockerTmpUser} --password-stdin`;
      }
      await runCommand(dockerCmdStr, runCommand.showStdout.inherit);

      dockerCmdStr = `docker push ${image}`;
      await runCommand(dockerCmdStr, runCommand.showStdout.inherit);
      logger.debug(`wait 3s to acr image ready`);
      await sleep(3);
    } catch (err) {
      try {
        if (image !== imageUrl) {
          // 尝试推送下 vpc 地址， 可以 s 工具运行在 vpc 内的 ECS 上
          logger.info(`retry to docker push ${imageUrl} ...`);
          let dockerCmdStr = `echo ${dockerTmpToken} | docker login ${imageUrl} --username ${dockerTmpUser} --password-stdin`;
          if (process.platform === 'win32') {
            dockerCmdStr = `echo|set /p="${dockerTmpToken}" | docker login ${imageUrl} --username ${dockerTmpUser} --password-stdin`;
          }
          await runCommand(dockerCmdStr, runCommand.showStdout.inherit);

          dockerCmdStr = `docker push ${imageUrl}`;
          await runCommand(dockerCmdStr, runCommand.showStdout.inherit);
          logger.debug(`wait 3s to acr image ready`);
          await sleep(3);
        }
      } catch (err2) {
        logger.error(
          `Fail to push image, if you have already pushed the image, you can use the "--skip-push" option to avoid pushing the image again. for example: s deploy --skip-push`,
        );
      }
    }
  }
}
