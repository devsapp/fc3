import { Logger } from '@serverless-devs/core';

export const CONTEXT = 'FC-LOCAL-INVOKE';

const logger = new Logger(CONTEXT);

export default logger;
