import { IFunction } from "../../../interface";
import logger from "../../../common/logger";

export default class Service {
  constructor(private type, private config: IFunction) {
    logger.debug(`deploy function type: ${this.type}`);
  }
}
