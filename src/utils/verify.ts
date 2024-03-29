import Ajv, { ErrorObject } from 'ajv';

import { IProps } from '../interface';
import logger from '../logger';
import { SCHEMA_FILE_PATH } from '../constant';
import { yellow } from 'chalk';

export default (props: IProps) => {
  // 注意：ncc 或者 esbuild 之后 __dirname 会变为 dist/
  logger.debug(`Validating file path: ${SCHEMA_FILE_PATH}`);

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const schema = require(SCHEMA_FILE_PATH);
    const ajv = new Ajv({
      allErrors: true,
      strictSchema: true,
      validateSchema: true,
    });
    const valid = ajv.validate(schema, props);

    logger.debug(`validate status: ${valid}`);
    if (!valid) {
      logger.debug(`validate error: ${JSON.stringify(ajv.errors, null, 2)}`);
      logger.debug(yellow(`Valid function props error:`));
      for (const error of ajv.errors as Array<ErrorObject<string, Record<string, any>, unknown>>) {
        logger.debug(yellow(`  ${error.instancePath}: ${error.message}`));
      }
      logger.debug(' \n ');
    }
  } catch (ex) {
    logger.debug(`Validate Error: ${ex}`);
  }
};
