import Ajv from 'ajv';
import path from 'path';

import { IProps } from '../interface';
import logger from '../common/logger';

export default (props: IProps) => {
  // 注意：ncc 或者 esbuild 之后 __dirname 会变为 dist/
  const tsFilePath = path.join(__dirname, 'schema.json');
  logger.debug(`Validating file path: ${tsFilePath}`);

  const schema = require(tsFilePath);
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
