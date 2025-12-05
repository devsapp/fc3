import logger from '../../../logger';
import { isProvisionConfigError, sleep } from '../../../utils';

export async function provisionConfigErrorRetry(
  fcSdk: any,
  command,
  functionName,
  qualifier,
  localConfig,
) {
  logger.info(`provisionConfigErrorRetry Execute： ${command}`);
  try {
    if (command === 'ProvisionConfig') {
      await fcSdk.putFunctionProvisionConfig(functionName, qualifier, localConfig);
    } else {
      await fcSdk.putFunctionScalingConfig(functionName, qualifier, localConfig);
    }
  } catch (err) {
    if (!isProvisionConfigError(err, functionName)) {
      throw err; // Re-throw non-provision config errors
    }

    logger.warn(
      `${command}: Reserved resource pool instances and elastic instances cannot be directly switched; \ntrying to delete existing scalingConfig, then create a new scalingConfig...`,
    );

    await removeScalingConfigSDK(fcSdk, functionName, qualifier);

    const maxRetries = 60;
    const retryDelay = 2;

    for (let i = 0; i < maxRetries; i++) {
      try {
        if (command === 'ProvisionConfig') {
          // eslint-disable-next-line no-await-in-loop
          await fcSdk.putFunctionProvisionConfig(functionName, qualifier, localConfig);
        } else {
          // eslint-disable-next-line no-await-in-loop
          await fcSdk.putFunctionScalingConfig(functionName, qualifier, localConfig);
        }
        logger.info(`Successfully created ${command} after retry`);
        return;
      } catch (err2) {
        if (!isProvisionConfigError(err2)) {
          throw err2; // Re-throw non-provision config errors
        }

        if (i < maxRetries - 1) {
          logger.info(`Retry ${i + 1}/${maxRetries}: putFunctionScalingConfig failed, retrying...`);
          // eslint-disable-next-line no-await-in-loop
          await sleep(retryDelay);
        }
      }
    }
    throw new Error(`Failed to create scalingConfig after ${maxRetries} attempts`);
  }
}

export async function removeScalingConfigSDK(fcSdk: any, functionName: string, qualifier: string) {
  try {
    logger.info(`Remove remote scalingConfig of ${functionName}/${qualifier}`);
    await fcSdk.removeFunctionScalingConfig(functionName, qualifier);

    // 等待弹性配置实例数降至0
    const maxRetries = 12;
    for (let index = 0; index < maxRetries; index++) {
      // eslint-disable-next-line no-await-in-loop
      const result = await fcSdk.getFunctionScalingConfig(functionName, qualifier);
      const { currentInstances } = result || {};

      if (!currentInstances || currentInstances === 0) {
        logger.info(`ScalingConfig of ${functionName}/${qualifier} removed successfully`);
        return;
      }

      logger.info(`waiting ${functionName}/${qualifier} scaling currentInstances to 0 ...`);
      // eslint-disable-next-line no-await-in-loop
      await sleep(5);
    }

    logger.warn(`Timeout waiting for scalingConfig of ${functionName}/${qualifier} to be removed`);
  } catch (err) {
    logger.error(`Remove for scalingConfig of ${functionName}/${qualifier} error: ${err.message}`);
    throw err;
  }
}
