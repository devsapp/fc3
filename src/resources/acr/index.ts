import { ICredentials } from '@serverless-devs/component-interface';
import _ from 'lodash';
import { getDockerTmpUser, getAcrEEInstanceID, getAcrImageMeta } from './login';
import { runCommand } from '../../utils';
import { IRegion } from '../../interface';
import logger from '../../logger';

export { getDockerTmpUser, mockDockerConfigFile } from './login';

export default class Acr {
  static isAcreeRegistry(imageUrl: string): boolean {
    // 容器镜像企业服务
    const registry = _.split(imageUrl, '/')[0];
    return registry.includes('registry') && registry.endsWith('cr.aliyuncs.com');
  }

  static isVpcAcrRegistry(imageUrl: string): boolean {
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
    if (instanceName !== '') {
      throw new Error('ACREE image is currently not supported');
    }
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
    let instanceID = this.instanceID;
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
      await runCommand(dockerCmdStr, runCommand.showStdout.inherit);

      dockerCmdStr = `docker push ${image}`;
      await runCommand(dockerCmdStr, runCommand.showStdout.inherit);
    } catch (err) {
      try {
        if (image !== imageUrl) {
          // 尝试推送下 vpc 地址， 可以 s 工具运行在 vpc 内的 ECS 上
          logger.info(`retry to docker push ${imageUrl} ...`);
          let dockerCmdStr = `echo ${dockerTmpToken} | docker login ${imageUrl} --username ${dockerTmpUser} --password-stdin`;
          await runCommand(dockerCmdStr, runCommand.showStdout.inherit);

          dockerCmdStr = `docker push ${imageUrl}`;
          await runCommand(dockerCmdStr, runCommand.showStdout.inherit);
        }
      } catch (err2) {
        logger.error(
          `Fail to push image, if you have already pushed the image, you can use the "--skip-push" option to avoid pushing the image again. for example: s deploy --skip-push`,
        );
      }
    }
  }
}
