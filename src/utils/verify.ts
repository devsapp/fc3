import Ajv from 'ajv';

import { IProps } from '../interface';
import logger from '../logger';
import { SCHEMA_FILE_PATH } from '../constant';

export default (props: IProps) => {
  // 注意：ncc 或者 esbuild 之后 __dirname 会变为 dist/
  logger.debug(`Validating file path: ${SCHEMA_FILE_PATH}`);

  const schema = require(SCHEMA_FILE_PATH);
  try {
    const ajv = new Ajv({
      allErrors: true,
      strictSchema: true,
      validateSchema: true,
    });
    const valid = ajv.validate(schema, props);

    logger.debug(`validate status: ${valid}`);
    if (!valid) {
      logger.debug(`validate error: ${JSON.stringify(ajv.errors, null, 2)}`);
      logger.warn(`Valid function props error:`);
      for (const error of ajv.errors) {
        logger.write(`  ${error.instancePath}: ${error.message}`);
      }
      logger.write(' \n ');
    }
  } catch (ex) {
    logger.error(`Validate Error: ${ex}`);
  }
};
