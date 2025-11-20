// 文生图服务下载，删除逻辑
import logger from '../../logger';
import DevClient, * as $Dev20230714 from '@alicloud/devs20230714';
import { IInputs } from '../../interface';
import _ from 'lodash';
import { checkModelStatus, extractOssMountDir, initClient } from './utils';

export class ArtModelService {
  logger = logger;
  region: string;
  constructor(private inputs: IInputs) {
    const { region } = this.inputs.props;
    this.region = region;
  }

  getSourceAndDestination(uri, file, nasMountPoints, ossMountPoints, targetUri) {
    // 处理源路径
    const source = this._getSourcePath(file, uri);
    // 处理目标路径
    const destination = this._getDestinationPath(targetUri, file, nasMountPoints, ossMountPoints);

    return {
      source,
      destination,
    };
  }

  async downloadModel(name, params) {
    const devClient = await initClient(this.inputs, this.region, logger, 'fun-art');
    const { nasMountPoints, ossMountPoints, role, modelConfig, vpcConfig, region } = params;
    const { files } = modelConfig;

    if (modelConfig.mode === 'never') {
      logger.info(
        '[Download-model] Skipping model download as modelConfig.mode is set to "never".',
      );
      return;
    }

    if (_.isEmpty(files)) {
      logger.info('[Download-model] No files specified for download.');
      return;
    }

    const processedOssMountPoints = extractOssMountDir(ossMountPoints);

    let existingTasks = null;
    if (modelConfig.mode === 'once') {
      // 先统一获取已有的任务列表
      const ListFileManagerTasksRequest = new $Dev20230714.ListFileManagerTasksRequest({
        name,
      });
      const res = await devClient.listFileManagerTasks(ListFileManagerTasksRequest);
      logger.debug('listFileManagerTasks', JSON.stringify(res, null, 2));
      existingTasks = res.body.data.tasks;
    }

    // 第一步：筛选真正需要下载的文件
    const filesNeedPromises = files.map(async (file) => {
      const { source, destination } = this.getSourceAndDestination(
        modelConfig.source.uri,
        file,
        nasMountPoints,
        processedOssMountPoints,
        modelConfig.target.uri,
      );

      const needDownload = !_.isEmpty(existingTasks)
        ? !existingTasks?.some(
            (task) =>
              task.finished &&
              task.success &&
              task.progress.currentBytes === task.progress.totalBytes &&
              task.parameters.destination === destination &&
              task.parameters.source === source,
          )
        : true;

      if (!needDownload) {
        logger.info(`[Download-model] ${file.source.path} The file has been downloaded.`);
        return null;
      }

      return {
        ...file,
        source,
        fileName: file.source.path,
        destination,
      };
    });

    const filesNeedResults = await Promise.all(filesNeedPromises);
    const filesNeed = filesNeedResults.filter(Boolean);

    // 添加调试日志
    logger.info(`[Download-model] Total files to check: ${files.length}`);
    logger.info(`[Download-model] Files need to download: ${filesNeed.length}`);

    // 如果没有需要下载的文件，直接返回
    if (filesNeed.length === 0) {
      logger.info('[Download-model] No files need to be downloaded.');
      return;
    }

    // 限制并发数量，避免同时发起过多请求
    const MAX_CONCURRENT_DOWNLOADS = 5;
    const results = [];
    let successCount = 0;
    let failureCount = 0;
    const failureDetails: Array<{ fileName: string; error: string }> = [];

    // 使用并发控制执行下载任务
    const downloadTasks = filesNeed.map((file) =>
      this._downloadSingleFile.bind(this, devClient, file, {
        name,
        nasMountPoints,
        ossMountPoints: processedOssMountPoints,
        role,
        region,
        vpcConfig,
        conflictResolution: process.env.MODEL_CONFLIC_HANDLING || modelConfig.conflictResolution,
        timeout: modelConfig?.timeout,
      }),
    );

    // 分批处理文件下载，每批最多 MAX_CONCURRENT_DOWNLOADS 个并发
    for (let i = 0; i < downloadTasks.length; i += MAX_CONCURRENT_DOWNLOADS) {
      const batch = downloadTasks.slice(i, i + MAX_CONCURRENT_DOWNLOADS);
      const batchPromises = batch.map((task) => task());

      try {
        // eslint-disable-next-line no-await-in-loop
        const batchResults = await Promise.allSettled(batchPromises);
        // 处理批处理结果
        // eslint-disable-next-line no-loop-func
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
            successCount++;
            logger.info(
              `[Download-model] Successfully downloaded file: ${filesNeed[i + index].fileName}`,
            );
          } else {
            failureCount++;
            const { fileName } = filesNeed[i + index];
            const errorDetail = result.reason.stack || result.reason.toString();

            // 记录详细错误信息到数组
            failureDetails.push({
              fileName,
              error: errorDetail,
            });
          }
        });
      } catch (error) {
        failureCount++;
        logger.error(`[Download-model] Batch download error: ${error.message}`);
        logger.error(`[Download-model] Batch error details:`, error.stack || error);
      }
    }

    // 输出最终统计信息
    logger.info(
      `[Download-model] All files download completed. Success: ${successCount}, Failed: ${failureCount}, Total: ${filesNeed.length}`,
    );

    // 打印所有失败的详细信息
    if (failureDetails.length > 0) {
      logger.error('[Download-model] Detailed failure information:');
      failureDetails.forEach((detail, index) => {
        logger.error(`  ${index + 1}. File: ${detail.fileName}`);
        logger.error(`     Error: ${detail.error}`);
      });
    }

    // 文件下载失败，抛出错误
    if (failureCount > 0) {
      throw new Error(
        `[Download-model] ${failureCount} out of ${filesNeed.length} files failed to download.`,
      );
    }
  }

  async removeModel(name, params) {
    const { nasMountPoints, ossMountPoints, role, vpcConfig, modelConfig, region } = params;
    try {
      const devClient = await initClient(this.inputs, this.region, logger, 'fun-art');
      const { files } = modelConfig;
      if (_.isEmpty(files)) {
        logger.info('[Remove-model] No files specified for removal.');
        return;
      }
      const processedOssMountPoints = extractOssMountDir(ossMountPoints);

      // 将异步操作重构为并行处理
      const removePromises = files.map((file) =>
        this._removeSingleFile(devClient, file, {
          name,
          nasMountPoints,
          ossMountPoints: processedOssMountPoints,
          role,
          vpcConfig,
          modelConfig,
          region,
          timeout: modelConfig?.timeout,
        }),
      );

      const removeResults = await Promise.all(removePromises);

      // 统计成功和失败的数量
      const successfulRemovals = removeResults.filter((result) => result.success);
      const failedRemovals = removeResults.filter((result) => !result.success);

      logger.info(
        `[Remove-model] Removal completed. Success: ${successfulRemovals.length}, Failed: ${failedRemovals.length}`,
      );

      // 只有当所有文件都成功删除时，才执行清理任务
      if (failedRemovals.length === 0) {
        logger.info('[Remove-model] All files removed successfully. Cleaning up task records.');

        const deleteFileManagerTasks = new $Dev20230714.RemoveFileManagerTasksRequest({
          name,
        });
        const deleteTasks = await devClient.removeFileManagerTasks(deleteFileManagerTasks);
        logger.debug('deleteTasks', JSON.stringify(deleteTasks, null, 2));
        logger.info(`[Remove-model] Completed removal process for ${files.length} files.`);
      } else {
        // 如果有任何失败，记录详细信息但不执行清理
        logger.error('[Remove-model] Some files failed to remove:');
        failedRemovals.forEach((result) => {
          logger.error(`  File: ${result.fileName}, Error: ${result.error}`);
        });

        throw new Error(
          `[Remove-model] ${failedRemovals.length} out of ${files.length} files failed to remove.`,
        );
      }
    } catch (error) {
      throw new Error(`[Remove-model] Removal process failed: ${error.message}`);
    }
  }

  private async _removeSingleFile(
    devClient: DevClient,
    file: any,
    config: {
      name: string;
      nasMountPoints: any[];
      ossMountPoints: any[];
      role: string;
      vpcConfig: any;
      modelConfig: any;
      region: string;
      timeout: number;
    },
  ) {
    const { name, nasMountPoints, ossMountPoints, role, vpcConfig, modelConfig, region, timeout } =
      config;

    try {
      let filepath;
      const uri = file.target?.uri || modelConfig.target.uri;
      const path = file.target?.path || '';

      // 判断uri是否为nas://auto或oss://auto
      if (uri.startsWith('nas://auto') && nasMountPoints?.length > 0) {
        const { mountDir } = nasMountPoints[0];
        filepath = `${mountDir}/${path}`;
      } else if (uri.startsWith('oss://auto') && ossMountPoints?.length > 0) {
        const { mountDir } = ossMountPoints[0];
        filepath = `${mountDir}/${path}`;
      } else {
        // 直接拼接uri和path
        const normalizedUri = uri.endsWith('/') ? uri.slice(0, -1) : uri;
        filepath = `${normalizedUri}/${path}`;
      }

      const fileManagerRmRequest = new $Dev20230714.FileManagerRmRequest({
        filepath,
        mountConfig: new $Dev20230714.FileManagerMountConfig({
          name,
          nasMountPoints,
          ossMountPoints,
          role,
          vpcConfig,
          region,
          timeoutInSecond: timeout,
        }),
      });

      logger.debug('FileManagerRmRequest', JSON.stringify(fileManagerRmRequest, null, 2));
      const res = await devClient.fileManagerRm(fileManagerRmRequest);
      logger.debug(
        `[Remove-model] Remove response for ${file.source.path}:`,
        JSON.stringify(res, null, 2),
      );

      let taskID;
      if (res.body.data?.taskID) {
        taskID = res.body.data.taskID;
      } else {
        return {
          fileName: file.source.path,
          success: false,
          error: 'No task ID returned from removal request',
        };
      }
      const shouldContinue = true;
      while (shouldContinue) {
        // eslint-disable-next-line no-await-in-loop
        const getFileManagerTask = await devClient.getFileManagerTask(taskID);
        logger.debug('getFileManagerTask', JSON.stringify(getFileManagerTask, null, 2));
        const modelStatus = getFileManagerTask?.body?.data;
        const removeFinished = modelStatus.success && modelStatus.finished;
        if (removeFinished) {
          logger.info(`[Remove-model] Successfully removed file ${file.source.path}`);
          return {
            fileName: file.source.path,
            success: true,
          };
        } else if (modelStatus.errorMessage) {
          if (modelStatus.errorMessage.includes('NoSuchFileError')) {
            logger.debug(`[Remove-model] ${file.source.path} not exist`);
            return {
              fileName: file.source.path,
              success: true,
            };
          }
          const errorMsg = `[Remove-model] model: ${modelStatus.errorMessage}, requestId: ${getFileManagerTask.body.requestId}`;
          logger.error(errorMsg);
          return {
            fileName: file.source.path,
            success: false,
            error: errorMsg,
          };
        }

        // 添加短暂延迟避免过于频繁的轮询
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      const fileName = file.source?.path || 'unknown';
      logger.error(`[Remove-model] Error removing file ${fileName}: ${error.message}`);
      logger.error(`[Remove-model] Error details:`, error.stack || error);
      return {
        fileName,
        success: false,
        error: error.message,
      };
    }
  }

  private async _downloadSingleFile(devClient: any, file: any, config: any) {
    const { source, destination, fileName } = file;
    const {
      name,
      nasMountPoints,
      ossMountPoints,
      role,
      region,
      vpcConfig,
      conflictResolution,
      timeout,
    } = config;

    try {
      // 发起文件同步请求
      const fileManagerRsyncRequest = new $Dev20230714.FileManagerRsyncRequest({
        mountConfig: new $Dev20230714.FileManagerMountConfig({
          name,
          nasMountPoints,
          ossMountPoints,
          role,
          region,
          vpcConfig,
          timeoutInSecond: timeout,
        }),
        source,
        destination,
        conflictHandling: conflictResolution,
      });
      logger.debug('FileManagerRsyncRequest', JSON.stringify(fileManagerRsyncRequest, null, 2));
      const req = await devClient.fileManagerRsync(fileManagerRsyncRequest);
      logger.debug(
        `[Download-model] fileManagerRsync response for ${fileName}: ${JSON.stringify(
          req.body,
          null,
          2,
        )}`,
      );
      if (!req?.body.success) {
        const errorMsg = `fileManagerRsync error: ${JSON.stringify(req?.body, null, 2)}`;
        logger.error(`[Download-model] ${fileName}: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      const { taskID } = req.body.data;
      logger.info(
        `[Download-model] download model requestId for ${fileName}: ${req.body.requestId}, taskID: ${taskID}`,
      );

      // 轮询任务状态直到完成
      await checkModelStatus(devClient, taskID, logger, fileName, timeout);
    } catch (error) {
      // 捕获并重新抛出错误，添加文件名信息
      logger.error(`\n[Download-model] Error downloading file ${fileName}: ${error.message}`);
      throw new Error(`${fileName}: ${error.message}`);
    }
  }

  private _getSourcePath(file: any, sourceUri: string): string {
    // 会有多个文件，file.source.uri 是该文件下载源路径，sourceUri 是公共的下载源
    const uri = file.source.uri || sourceUri;
    const path = file.source?.path || '';
    const validSourcePattern = /^(modelscope|oss|nas):\/\//;

    if (validSourcePattern.test(uri)) {
      const downloadUri = uri.endsWith('/') ? uri.slice(0, -1) : uri;
      return `${downloadUri}/${path}`;
    } else {
      throw new Error(
        `Invalid source path. Expected a valid URI starting with 'modelscope://', 'oss://', or 'nas://', but got: ${path}`,
      );
    }
  }

  private _getDestinationPath(
    targetUri: string,
    file: any,
    nasMountPoints: any[],
    ossMountPoints: any[],
  ): string {
    // file.target.uri 多个nas或者oss挂载点时，优先判断是否有指定挂载点，否则使用默认挂载点
    const uri = file.target?.uri || targetUri;
    const path = file.target?.path || '';

    // 判断uri是否为nas://auto或oss://auto
    if (uri.startsWith('nas://auto') && nasMountPoints?.length > 0) {
      const mountDir = nasMountPoints[0].mountDir.startsWith('/')
        ? nasMountPoints[0].mountDir.slice(1)
        : nasMountPoints[0].mountDir;
      return `file://${mountDir}/${path}`;
    } else if (uri.startsWith('oss://auto') && ossMountPoints?.length > 0) {
      const mountDir = ossMountPoints[0].mountDir.startsWith('/')
        ? ossMountPoints[0].mountDir.slice(1)
        : ossMountPoints[0].mountDir;
      return `file://${mountDir}/${path}`;
    } else {
      // 直接拼接uri和path
      const normalizedUri = uri.endsWith('/') ? uri.slice(0, -1) : uri;
      return `file://${normalizedUri}/${path}`;
    }
  }
}
