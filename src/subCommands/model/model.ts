// 模型服务下载，删除逻辑
import logger from '../../logger';
import * as $Dev20230714 from '@alicloud/devs20230714';
import { IInputs } from '../../interface';
import {
  extractOssMountDir,
  initClient,
  retryFileManagerRsyncAndCheckStatus,
  retryFileManagerRm,
} from './utils';

export class ModelService {
  logger = logger;
  region: string;
  constructor(private inputs: IInputs) {
    const { region } = this.inputs.props;
    this.region = region;
  }

  async downloadModel(name, params) {
    const devClient = await initClient(this.inputs, this.region, 'fun-model');
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

    // 使用公共方法重试fileManagerRsync + checkModelStatus流程
    await retryFileManagerRsyncAndCheckStatus(
      devClient,
      fileManagerRsyncRequest,
      '',
      modelConfig.timeout,
      2,
      30,
    );
  }

  async removeModel(name, params) {
    const { nasMountPoints, ossMountPoints, role, region, vpcConfig, storage } = params;
    const devClient = await initClient(this.inputs, this.region, 'fun-model');

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

    await retryFileManagerRm(devClient, fileManagerRmRequest, 'model', 3, 30);

    // 清理任务记录
    const deleteFileManagerTasks = new $Dev20230714.RemoveFileManagerTasksRequest({
      name,
    });
    const deleteTasks = await devClient.removeFileManagerTasks(deleteFileManagerTasks);
    logger.debug('deleteTasks', JSON.stringify(deleteTasks, null, 2));
  }
}
