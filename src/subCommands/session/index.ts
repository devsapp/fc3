import { parseArgv } from '@serverless-devs/utils';
import commandsHelp from '../../commands-help/session';
import { IInputs, IRegion, checkRegion } from '../../interface';
import logger from '../../logger';
import _ from 'lodash';
import FC from '../../resources/fc';
import { getUserAgent, promptForConfirmOrDetails } from '../../utils';

const commandsList = Object.keys(commandsHelp.subCommands);

export default class Session {
  readonly subCommand: string;
  private region: IRegion;
  private functionName: string;
  private fcSdk: FC;
  private opts: any;
  private yes: boolean;
  private nasConfig: any;

  constructor(readonly inputs: IInputs) {
    const opts = parseArgv(inputs.args, {
      alias: {
        help: 'h',
        'assume-yes': 'y',
        'session-ttl-in-seconds': 'st',
        'session-idle-timeout-in-seconds': 'si',
      },
      boolean: ['help', 'y'],
      string: [
        'region',
        'function-name',
        'session-id',
        'qualifier',
        'timeout',
        'limit',
        'next-token',
        'session-status',
        'nas-config',
      ],
    });
    logger.debug(`Session opts: ${JSON.stringify(opts)}`);
    const { region, 'function-name': functionName, 'assume-yes': yes, _: subCommands } = opts;

    logger.debug('subCommands: ', subCommands);
    const subCommand = _.get(subCommands, '[0]');
    if (!subCommand || !commandsList.includes(subCommand)) {
      throw new Error(
        `Command "${subCommand}" not found, Please use "s cli fc3 session -h" to query how to use the command`,
      );
    }

    this.region = region || _.get(inputs, 'props.region');
    checkRegion(this.region);
    logger.debug(`region: ${this.region}`);

    this.functionName = functionName || _.get(inputs, 'props.functionName');
    logger.debug(`function name: ${this.functionName}`);

    this.subCommand = subCommand;
    this.yes = !!yes;
    const userAgent = getUserAgent(inputs.userAgent, `session`);
    this.fcSdk = new FC(this.region, this.inputs.credential, {
      endpoint: inputs.props.endpoint,
      userAgent,
    });

    this.opts = opts;
    if (opts['nas-config']) {
      try {
        this.nasConfig = JSON.parse(opts['nas-config']);
      } catch (error) {
        this.nasConfig = opts['nas-config'];
      }
    }
  }

  async create() {
    const qualifier = this.opts.qualifier || 'LATEST';
    const sessionTTLInSeconds = this.opts['session-ttl-in-seconds']
      ? parseInt(this.opts['session-ttl-in-seconds'], 10)
      : 21600;
    const sessionIdleTimeoutInSeconds = this.opts['session-idle-timeout-in-seconds']
      ? parseInt(this.opts['session-idle-timeout-in-seconds'], 10)
      : 1800;
    if (_.isEmpty(this.functionName)) {
      throw new Error('functionName not specified, please specify --function-name');
    }
    if (_.isEmpty(qualifier)) {
      throw new Error('qualifier not specified, please specify --qualifier');
    }
    if (
      !_.isNumber(sessionTTLInSeconds) ||
      sessionTTLInSeconds < 0 ||
      sessionTTLInSeconds > 21600
    ) {
      throw new Error('timeout must be a number between 0 and 21600');
    }
    if (
      !_.isNumber(sessionIdleTimeoutInSeconds) ||
      sessionIdleTimeoutInSeconds < 0 ||
      sessionIdleTimeoutInSeconds > 21600
    ) {
      throw new Error('timeout must be a number between 0 and 21600');
    }

    const config: any = {};
    if (qualifier) config.qualifier = qualifier;
    if (sessionTTLInSeconds) config.sessionTTLInSeconds = sessionTTLInSeconds;
    if (sessionIdleTimeoutInSeconds)
      config.sessionIdleTimeoutInSeconds = sessionIdleTimeoutInSeconds;
    if (this.nasConfig) config.nasConfig = this.nasConfig;

    try {
      const result = await this.fcSdk.createFunctionSession(this.functionName, config);
      logger.info(`Session created successfully: ${JSON.stringify(result)}`);
      return result;
    } catch (ex) {
      logger.error(`Failed to create session: ${ex.message}`);
      throw ex;
    }
  }

  async get() {
    const sessionId = this.opts['session-id'];
    const { qualifier } = this.opts;
    if (_.isEmpty(this.functionName)) {
      throw new Error('functionName not specified, please specify --function-name');
    }
    if (_.isEmpty(sessionId)) {
      throw new Error('sessionId not specified, please specify --session-id');
    }
    if (_.isEmpty(qualifier)) {
      throw new Error('qualifier not specified, please specify --qualifier');
    }

    try {
      const result = await this.fcSdk.getFunctionSession(this.functionName, sessionId, qualifier);
      logger.info(`Session get successfully: ${JSON.stringify(result)}`);
      return result;
    } catch (ex) {
      logger.error(`Failed to get session ${sessionId}: ${ex.message}`);
      throw ex;
    }
  }

  async update() {
    const sessionId = this.opts['session-id'];
    const { qualifier } = this.opts;
    const sessionTTLInSeconds = parseInt(this.opts['session-ttl-in-seconds'], 10);
    const sessionIdleTimeoutInSeconds = this.opts['session-idle-timeout-in-seconds']
      ? parseInt(this.opts['session-idle-timeout-in-seconds'], 10)
      : 1800;
    if (_.isEmpty(this.functionName)) {
      throw new Error('functionName not specified, please specify --function-name');
    }
    if (_.isEmpty(sessionId)) {
      throw new Error('sessionId not specified, please specify --session-id');
    }
    if (_.isEmpty(qualifier)) {
      throw new Error('qualifier not specified, please specify --qualifier');
    }
    if (
      !_.isNumber(sessionTTLInSeconds) ||
      sessionTTLInSeconds < 0 ||
      sessionTTLInSeconds > 21600
    ) {
      throw new Error('timeout must be a number between 0 and 21600');
    }
    if (
      !_.isNumber(sessionIdleTimeoutInSeconds) ||
      sessionIdleTimeoutInSeconds < 0 ||
      sessionIdleTimeoutInSeconds > 21600
    ) {
      throw new Error('timeout must be a number between 0 and 21600');
    }

    const config: any = {};
    if (qualifier) config.qualifier = qualifier;
    if (sessionTTLInSeconds) config.sessionTTLInSeconds = sessionTTLInSeconds;
    if (sessionIdleTimeoutInSeconds)
      config.sessionIdleTimeoutInSeconds = sessionIdleTimeoutInSeconds;

    try {
      const result = await this.fcSdk.updateFunctionSession(this.functionName, sessionId, config);
      logger.info(`Session updated successfully: ${JSON.stringify(result)}`);
      return result;
    } catch (ex) {
      logger.error(`Failed to update session ${sessionId}: ${ex.message}`);
      throw ex;
    }
  }

  async list() {
    if (_.isEmpty(this.functionName)) {
      throw new Error('functionName not specified, please specify --function-name');
    }
    const limit = this.opts.limit ? parseInt(this.opts.limit, 10) : 20;
    const nextToken = this.opts['next-token'];
    const { qualifier } = this.opts;
    const sessionId = this.opts['session-id'];
    const sessionStatus = this.opts['session-status'];

    try {
      const queryParams: any = { limit };
      if (nextToken) queryParams.nextToken = nextToken;
      if (qualifier) queryParams.qualifier = qualifier;
      if (sessionId) queryParams.sessionId = sessionId;
      if (sessionStatus) queryParams.sessionStatus = sessionStatus;
      const result = await this.fcSdk.listFunctionSessions(this.functionName, queryParams);
      logger.debug(`Session list successfully: ${JSON.stringify(result)}`);
      return result.sessions || [];
    } catch (ex) {
      logger.error(`Failed to list sessions: ${ex.message}`);
      throw ex;
    }
  }

  async remove() {
    const sessionId = this.opts['session-id'];
    const { qualifier } = this.opts;
    if (_.isEmpty(this.functionName)) {
      throw new Error('functionName not specified, please specify --function-name');
    }
    if (_.isEmpty(sessionId)) {
      throw new Error('sessionId not specified, please specify --session-id');
    }
    if (_.isEmpty(qualifier)) {
      throw new Error('qualifier not specified, please specify --qualifier');
    }

    if (!this.yes) {
      const assumeDelete = await promptForConfirmOrDetails(
        `Are you sure you want to delete session ${sessionId}? Enter 'yes' to confirm:`,
      );
      if (!assumeDelete) {
        logger.debug(`Skip remove session ${sessionId}`);
        return;
      }
    }

    try {
      const result = await this.fcSdk.removeFunctionSession(
        this.functionName,
        sessionId,
        qualifier,
      );
      logger.info(`Session removed successfully`, result);
      return result;
    } catch (ex) {
      logger.error(`Failed to remove session ${sessionId}: ${ex.message}`);
      throw ex;
    }
  }
}
