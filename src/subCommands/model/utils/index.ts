import { IInputs } from '../../../interface';
import {
  NEW_MODEL_SERVICE_CLIENT_CONNECT_TIMEOUT,
  NEW_MODEL_SERVICE_CLIENT_READ_TIMEOUT,
} from '../constants';
import * as $OpenApi from '@alicloud/openapi-client';
import DevClient from '@alicloud/devs20230714';
import { sleep } from '../../../utils';
import { isEmpty } from 'lodash';
import logger from '../../../logger';

function isInitializeError(errorMessage) {
  if (
    errorMessage &&
    errorMessage.includes(
      'initialize download failed: failed to initialize the download environment; this is usually caused by your NAS being inaccessible.',
    )
  ) {
    return true;
  }
  return false;
}

export const _getEndpoint = (region): string => {
  if (process.env.ARTIFACT_ENDPOINT) {
    return process.env.ARTIFACT_ENDPOINT;
  }
  if (process.env.artifact_endpoint) {
    return process.env.artifact_endpoint;
  }
  return `devs.${region}.aliyuncs.com`;
};

export const initClient = async (inputs: IInputs, region: string, solution: string) => {
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

  logger.info(`DEVS_ENDPOINT endpoint: ${config.endpoint}`);

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

export function extractOssMountDir(ossMountPoints) {
  let processedOssMountPoints;
  if (!isEmpty(ossMountPoints)) {
    processedOssMountPoints = ossMountPoints.map((ossMountPoint) => ({
      ...ossMountPoint,
      mountDir:
        ossMountPoint.mountDir.length > 48
          ? ossMountPoint.mountDir.substring(0, 48)
          : ossMountPoint.mountDir,
    }));
  }
  return processedOssMountPoints;
}

export async function retryFileManagerRsyncAndCheckStatus(
  devClient: DevClient,
  fileManagerRsyncRequest: any,
  fileName: string,
  timeout: number,
  maxRetries = 2,
  baseDelay = 30,
) {
  let lastError;
  let success = false;

  try {
    const req = await devClient.fileManagerRsync(fileManagerRsyncRequest);
    logger.debug(`[Download-model] fileManagerRsync`, JSON.stringify(req, null, 2));
    if (!req?.body.success) {
      const errorMsg = `fileManagerRsync error: ${JSON.stringify(req?.body, null, 2)}`;
      logger.error(`[Download-model] ${fileName}: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    const { taskID } = req.body.data;
    logger.info(
      `[Download-model] requestId for ${fileName}: ${req.body.requestId}, taskID: ${taskID}`,
    );

    await checkModelStatus(devClient, taskID, fileName, timeout);
    success = true;
  } catch (error) {
    lastError = error;
    if (!isInitializeError(error.message)) {
      logger.error(
        `[Download-model] Non-initialization error encountered for ${fileName}, aborting retries.`,
      );
      throw error;
    }

    logger.warn(
      `[Download-model] Detected initialization error for ${fileName}, starting retry sequence...`,
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const delay = baseDelay * Math.pow(2, attempt - 1);

      logger.warn(
        `[Download-model] Retry attempt ${attempt}/${maxRetries} for ${fileName}. Waiting ${delay}s...`,
      );

      // eslint-disable-next-line no-await-in-loop
      await sleep(delay);

      try {
        // eslint-disable-next-line no-await-in-loop
        const req = await devClient.fileManagerRsync(fileManagerRsyncRequest);
        logger.debug(`[Download-model] fileManagerRsync`, JSON.stringify(req, null, 2));
        if (!req?.body.success) {
          const errorMsg = `fileManagerRsync error: ${JSON.stringify(req?.body, null, 2)}`;
          logger.error(`[Download-model] ${fileName}: ${errorMsg}`);
          throw new Error(errorMsg);
        }

        const { taskID } = req.body.data;
        logger.info(
          `[Download-model] requestId for ${fileName}: ${req.body.requestId}, taskID: ${taskID}`,
        );

        // eslint-disable-next-line no-await-in-loop
        await checkModelStatus(devClient, taskID, fileName, timeout);
        success = true;
        break;
      } catch (retryError) {
        lastError = retryError;

        if (!isInitializeError(retryError.message)) {
          logger.error(
            `[Download-model] Non-initialization error encountered for ${fileName}, aborting retries.`,
          );
          throw retryError;
        }
        if (attempt === maxRetries) {
          logger.warn(
            `[Download-model] Max retries (${maxRetries}) reached for ${fileName}. Throwing last error:`,
            retryError.message,
          );
        }
      }
    }
  }

  if (!success) {
    throw lastError;
  }
}

// 用于fileManagerRm操作的指数退避重试函数
export async function retryFileManagerRm(
  devClient: DevClient,
  fileManagerRmRequest: any,
  fileName: string,
  maxRetries = 3,
  baseDelay = 30,
) {
  for (let attempts = 0; attempts <= maxRetries; attempts++) {
    try {
      logger.debug('FileManagerRmRequest', JSON.stringify(fileManagerRmRequest, null, 2));
      // eslint-disable-next-line no-await-in-loop
      const res = await devClient.fileManagerRm(fileManagerRmRequest);
      logger.debug(`[Remove-model] Remove response for ${fileName}:`, JSON.stringify(res, null, 2));

      let taskID: string;
      if (res.body.data?.taskID) {
        taskID = res.body.data.taskID;
      } else {
        throw new Error('No task ID returned from removal request');
      }
      logger.info(
        `[Remove-model] requestId for ${fileName}: ${res.body.requestId}, taskID: ${taskID}`,
      );

      const shouldContinue = true;
      while (shouldContinue) {
        // eslint-disable-next-line no-await-in-loop
        const getFileManagerTask = await devClient.getFileManagerTask(taskID);
        logger.debug('getFileManagerTask', JSON.stringify(getFileManagerTask, null, 2));
        const modelStatus = getFileManagerTask?.body?.data;
        const removeFinished = modelStatus.success && modelStatus.finished;

        if (removeFinished) {
          logger.info(`[Remove-model] Successfully removed file ${fileName}`);
          return {
            fileName,
            success: true,
          };
        } else if (modelStatus.errorMessage) {
          if (modelStatus.errorMessage.includes('NoSuchFileError')) {
            logger.debug(`[Remove-model] ${fileName} not exist`);
            return {
              fileName,
              success: true,
            };
          }

          if (isInitializeError(modelStatus.errorMessage) && attempts < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempts - 1);
            logger.error(
              `[Remove-model] model: ${modelStatus.errorMessage}, requestId: ${getFileManagerTask.body.requestId}`,
            );
            logger.warn(
              `[Remove-model] Detected initialization error for ${fileName}, retrying... (${
                attempts + 1
              }/${maxRetries}). Waiting ${delay}s`,
            );

            // eslint-disable-next-line no-await-in-loop
            await sleep(delay);

            break;
          }

          const errorMsg = `[Remove-model] model: ${modelStatus.errorMessage}, requestId: ${getFileManagerTask.body.requestId}`;
          logger.error(errorMsg);
          throw new Error(errorMsg);
        }

        // eslint-disable-next-line no-await-in-loop
        await sleep(3);
      }
    } catch (error) {
      logger.error(`[Remove-model] Error removing file ${fileName}: ${error.message}`);
      logger.error(`[Remove-model] Error details:`, error.stack || error);
      throw error;
    }
  }

  throw new Error(
    `Failed to remove file after ${maxRetries + 1} attempts due to initialization errors`,
  );
}
