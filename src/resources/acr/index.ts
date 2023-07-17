import { ICredentials } from '@serverless-devs/component-interface';
import _ from 'lodash';
import { getDockerTmpUser } from './login';
import { runCommand } from '../../utils';

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

  constructor(private region: string, private credential: ICredentials) { }
  
  async pushAcr(imageUrl: string, instanceID?: string): Promise<void> {
    const image = Acr.vpcImage2InternetImage(imageUrl);
    try {
      const { dockerTmpUser, dockerTmpToken } = await getDockerTmpUser(
        this.region,
        this.credential,
        instanceID,
      );
      let dockerCmdStr = `docker login ${image} --username=${dockerTmpUser} --password ${dockerTmpToken}`;
      await runCommand(dockerCmdStr);
  
      dockerCmdStr = `docker push ${image}`;
      await runCommand(dockerCmdStr, undefined, true);
    } catch (err) {}
  }
}
