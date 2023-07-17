import logger from "../../logger";
import _ from 'lodash';


export default class Role {
  static completionArn(role: string, accountID: string): string {
    if (!_.isString(role)) {
      logger.debug(`Role ${role} is not a string, skipping handle`);
      return role;
    }

    if (/^acs:ram::\d+:role\/.+/.test(role)) {
      logger.debug(`Use role: ${role}`);
      return role;
    }
  
    const arn = `acs:ram::${accountID}:role/${role}`;
    logger.debug(`Assemble role: ${arn}`);
    return arn;
  }
}
