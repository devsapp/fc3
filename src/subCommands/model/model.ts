// 模型服务下载，删除逻辑
import logger from '../../logger';
import * as $Dev20230714 from '@alicloud/devs20230714';
import { IInputs } from '../../interface';
import { checkModelStatus, extractOssMountDir, initClient } from './utils';

export class ModelService {
  logger = logger;
  region: string;
  constructor(private inputs: IInputs) {
    const { region } = this.inputs.props;
    this.region = region;
  }

  async downloadModel(name, params) {
    const devClient = await initClient(this.inputs, this.region, logger, 'fun-model');
    const { nasMountPoints, ossMountPoints, role, modelConfig, vpcConfig, region, storage } =
      params;
    // 判断modelConfig.source是否是modelscope://、oss://或nas://
    let source;
    const reversion = modelConfig.reversion ? `@${modelConfig.reversion}` : '';
    if (
      modelConfig.source.startsWith('modelscope') &&
      !modelConfig.source.startsWith('modelscope://')
    ) {
      source = `modelscope://${modelConfig.model}${reversion}`;
    } else {
      source = `${modelConfig.source}${reversion}`;
    }
    const validSourcePattern = /^(modelscope|oss):\/\//;
    if (!validSourcePattern.test(source)) {
      throw new Error(
        `Invalid source path. Expected a valid URI starting with 'modelscope://', or 'oss://', but got: ${modelConfig.source}`,
      );
    }

    if (modelConfig.mode === 'never') {
      logger.info(
        '[Download-model] Skipping model download as modelConfig.mode is set to "never".',
      );
      return;
    }

    const processedOssMountPoints = extractOssMountDir(ossMountPoints);

    // mode 是 once 时候，判断是否已经下载过
    const destination =
      storage === 'nas'
        ? `file:/${nasMountPoints[0].mountDir}`
        : `file:/${processedOssMountPoints[0].mountDir}`;
    if (modelConfig.mode === 'once') {
      const ListFileManagerTasksRequest = new $Dev20230714.ListFileManagerTasksRequest({
        name,
      });
      const res = await devClient.listFileManagerTasks(ListFileManagerTasksRequest);
      logger.debug('listFileManagerTasks', JSON.stringify(res, null, 2));
      const { tasks } = res.body.data;
      const needDownload = !tasks.some(
        (task) =>
          task.finished &&
          task.success &&
          task.progress.currentBytes === task.progress.totalBytes &&
          task.parameters.source === source &&
          task.parameters.destination === destination,
      );
      if (!needDownload) {
        logger.info('[Download-model] The model has been downloaded.');
        return;
      }
    }

    const fileManagerRsyncRequest = new $Dev20230714.FileManagerRsyncRequest({
      mountConfig: new $Dev20230714.FileManagerMountConfig({
        name,
        nasMountPoints,
        ossMountPoints: processedOssMountPoints,
        role,
        region,
        vpcConfig,
        timeoutInSecond: modelConfig.timeout,
      }),
      source,
      destination,
      conflictHandling: process.env.MODEL_CONFLIC_HANDLING || modelConfig.conflictResolution,
    });
    logger.debug(JSON.stringify(fileManagerRsyncRequest, null, 2));
    const req = await devClient.fileManagerRsync(fileManagerRsyncRequest);
    logger.debug('fileManagerRsync', JSON.stringify(req, null, 2));
    if (!req?.body.success) {
      throw new Error(`fileManagerRsync error: ${JSON.stringify(req?.body, null, 2)}`);
    }

    const { taskID } = req.body.data;
    logger.info(`download model requestId: ${req.body.requestId}`);
    await checkModelStatus(devClient, taskID, logger, '', modelConfig.timeout);
  }

  async removeModel(name, params) {
    const { nasMountPoints, ossMountPoints, role, region, vpcConfig, storage } = params;
    const devClient = await initClient(this.inputs, this.region, logger, 'fun-model');

    const processedOssMountPoints = extractOssMountDir(ossMountPoints);

    const fileManagerRmRequest = new $Dev20230714.FileManagerRmRequest({
      filepath:
        storage === 'nas' ? nasMountPoints[0]?.mountDir : processedOssMountPoints[0]?.mountDir,
      mountConfig: new $Dev20230714.FileManagerMountConfig({
        name,
        nasMountPoints,
        ossMountPoints: processedOssMountPoints,
        role,
        vpcConfig,
        region,
      }),
    });
    logger.debug('fileManagerRmRequest', JSON.stringify(fileManagerRmRequest, null, 2));
    const res = await devClient.fileManagerRm(fileManagerRmRequest);
    logger.debug('removeModel', JSON.stringify(res, null, 2));
    let taskID;
    if (res?.body.data?.taskID) {
      taskID = res.body.data.taskID;
    }
    const shouldContinue = true;
    while (shouldContinue) {
      // eslint-disable-next-line no-await-in-loop
      const getFileManagerTask = await devClient.getFileManagerTask(taskID);
      logger.debug('getFileManagerTask', JSON.stringify(getFileManagerTask, null, 2));
      const modelStatus = getFileManagerTask?.body?.data;
      const removeFinished = modelStatus?.success && modelStatus?.finished;
      if (removeFinished) {
        const deleteFileManagerTasks = new $Dev20230714.RemoveFileManagerTasksRequest({
          name,
        });
        // eslint-disable-next-line no-await-in-loop
        const deleteTasks = await devClient.removeFileManagerTasks(deleteFileManagerTasks);
        logger.debug('deleteTasks', JSON.stringify(deleteTasks, null, 2));
        return;
      } else if (modelStatus?.errorMessage) {
        const errorMsg = `[Download-model] model: ${modelStatus.errorMessage} ,requestId: ${getFileManagerTask.body.requestId}`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
      }
    }
  }
}
