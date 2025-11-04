import { IInputs } from '../../../interface';
import {
  NEW_MODEL_SERVICE_CLIENT_CONNECT_TIMEOUT,
  NEW_MODEL_SERVICE_CLIENT_READ_TIMEOUT,
} from '../constants';
import * as $OpenApi from '@alicloud/openapi-client';
import DevClient from '@alicloud/devs20230714';
import { sleep } from '../../../utils';

export const _getEndpoint = (region): string => {
  if (process.env.ARTIFACT_ENDPOINT) {
    return process.env.ARTIFACT_ENDPOINT;
  }
  if (process.env.artifact_endpoint) {
    return process.env.artifact_endpoint;
  }
  return `devs.${region}.aliyuncs.com`;
};

export const initClient = async (inputs: IInputs, region: string, logger, solution: string) => {
  const {
    AccessKeyID: accessKeyId,
    AccessKeySecret: accessKeySecret,
    SecurityToken: securityToken,
  } = await inputs.getCredential();

  const endpoint = _getEndpoint(region);
  const protocol = 'https';

  const config = new $OpenApi.Config({
    accessKeyId,
    accessKeySecret,
    securityToken,
    protocol,
    endpoint,
    readTimeout: NEW_MODEL_SERVICE_CLIENT_READ_TIMEOUT,
    connectTimeout: NEW_MODEL_SERVICE_CLIENT_CONNECT_TIMEOUT,
    userAgent: `${
      inputs.userAgent ||
      `Component:${solution};Nodejs:${process.version};OS:${process.platform}-${process.arch}`
    }`,
  });

  logger.info(`new models service init, DEVS_ENDPOINT endpoint: ${config.endpoint}`);

  return new DevClient(config);
};

export const _displayProgressComplete = (
  filePath = '',
  currentBytes: number,
  totalBytes: number,
) => {
  if (totalBytes && currentBytes !== undefined) {
    const currentMB = (currentBytes / 1024 / 1024).toFixed(1);
    const totalMB = (totalBytes / 1024 / 1024).toFixed(1);

    const totalBars = 50;
    const progressBar = '='.repeat(totalBars);

    process.stdout.write(
      `\r[Download-model] ${filePath} [${progressBar}] 100.00% (${currentMB}MB/${totalMB}MB)\n`,
    );
  } else {
    process.stdout.write('\n');
  }
  // 清除进度条并换行
  process.stdout.write('\n');
};

export const _displayProgress = (filePath = '', currentBytes: number, totalBytes: number) => {
  if (currentBytes && totalBytes) {
    const percentage = (currentBytes / totalBytes) * 100;
    const currentMB = (currentBytes / 1024 / 1024).toFixed(1);
    const totalMB = (totalBytes / 1024 / 1024).toFixed(1);

    // 每个等号代表2%，向下取整计算等号数量
    const totalBars = 50; // 总共50个字符位置
    const filledBars = Math.min(totalBars, Math.floor(percentage / 2)); // 每个等号代表2%
    const emptyBars = totalBars - filledBars;

    const progressBar = '='.repeat(filledBars) + '.'.repeat(emptyBars);

    process.stdout.write(
      `\r[Download-model] ${filePath} [${progressBar}] ${percentage.toFixed(
        2,
      )}% (${currentMB}MB/${totalMB}MB)`,
    );
  }
};

// 查看轮询结果
export async function checkModelStatus(
  devClient: DevClient,
  taskID: string,
  logger: any,
  fileName: string,
  timeout: number,
) {
  const shouldContinue = true;
  while (shouldContinue) {
    // eslint-disable-next-line no-await-in-loop
    const getFileManager = await devClient.getFileManagerTask(taskID);
    logger.debug('getFileManagerTask', JSON.stringify(getFileManager, null, 2));
    const modelStatus = getFileManager.body.data;
    const totalBytes = (modelStatus.progress.totalBytes as any) - 0;
    const currentBytes = (modelStatus.progress.currentBytes as any) - 0;

    if (modelStatus.finished) {
      // 如果存在错误信息，则抛出异常
      if (modelStatus.errorMessage) {
        const errorMsg = `[Download-model] ${fileName}: ${modelStatus.errorMessage} ,requestId: ${getFileManager.body.requestId}`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }
      // 下载成功完成
      _displayProgressComplete(fileName, currentBytes, totalBytes);
      if (modelStatus.progress.total) {
        const durationMs = modelStatus.finishedTime - modelStatus.startTime;
        const durationSeconds = Math.floor(durationMs / 1000);
        logger.info(`Time taken for ${fileName || 'model'} download: ${durationSeconds}s.`);
      }
      logger.info(`[Download-model] Download ${fileName || 'model'} finished.`);
      return true;
    }
    // 显示下载进度
    _displayProgress(fileName, currentBytes, totalBytes);

    const modelTimeout = timeout;
    if (Date.now() - modelStatus.startTime > modelTimeout) {
      // 清除进度条并换行
      process.stdout.write('\n');
      const errorMessage = `[Model-download] Download timeout after ${
        modelTimeout / 1000 / 60
      } minutes`;
      throw new Error(errorMessage);
    }

    // 根据文件大小调整轮询间隔
    let sleepTime = 2; // 默认2秒
    if (totalBytes !== undefined && totalBytes > 1024 * 1024 * 1024) {
      // 文件大于1GB时，轮询间隔为10秒
      sleepTime = 10;
    }

    // eslint-disable-next-line no-await-in-loop
    await sleep(sleepTime);
  }
}
