/* eslint-disable no-await-in-loop */
import { parseArgv } from '@serverless-devs/utils';
import { IInputs, ILogConfig } from '../../interface';
import logger from '../../logger';
import inquirer from 'inquirer';
import { SLS } from 'aliyun-sdk';
import moment from 'moment';
import _ from 'lodash';
import { TIME_ERROR_TIP, DATE_TIME_REG } from './constant';
import FC, { GetApiType } from '../../resources/fc';
import { ICredentials } from '@serverless-devs/component-interface';

interface IGetLogs {
  projectName: string;
  logStoreName: string;
  from: string | number;
  to: string | number;
  topic: string;
  query: string;
}

interface IRealtime {
  projectName: string;
  logStoreName: string;
  topic: string;
  query: string;
  search: string;
  qualifier: string;
  match: string;
}

interface IHistory extends IRealtime {
  startTime: string;
  endTime: string;
  type: 'success' | 'fail' | 'failed';
  requestId: string;
  instanceId: string;
}

interface IProps extends IHistory {
  region: string;
  tail: boolean;
}

const replaceAll = (string, search, replace) => string.split(search).join(replace);
const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
const COLOR_MAP = ['\x1B[36m', '\x1B[32m', '\x1B[33m', '\x1B[34m'];
const instanceIds = new Map();

export default class Logs {
  logger = logger;
  slsClient: any;
  opts: any;
  fcSdk: FC;
  getApiType: GetApiType;
  region: any;

  constructor(private inputs: IInputs) {
    this.logger.debug(
      `inputs params: ${JSON.stringify(this.inputs.props)}, args: ${this.inputs.args}`,
    );
    /**
     * region | query(functionName) | topic | project | logstore: 这五个参数在 fc 组件不需要指定
     * tail: 实时日志
     * start-time | end-time: 查询的时间区间，默认 20min
     *
     * search: 关键字查询（之前是 keyword，后修改为 search）
     * type: success | fail
     * request-id: 根据 request-id 过滤
     * instance-id: 根据 instance-id 过滤
     * qualifier: 查询指定版本或者别名
     * match: 匹配到的字符高亮
     */
    const apts = {
      boolean: ['tail', 'help'],
      string: [
        'request-id',
        'search',
        'instance-id',
        'match',
        'qualifier',
        'region',
        'query',
        'function-name',
      ],
      alias: { tail: 't', 'start-time': 's', 'end-time': 'e', 'request-id': 'r', help: 'h' },
    };
    this.opts = parseArgv(this.inputs.args, apts) || {};
    this.logger.debug(`opts is: ${JSON.stringify(this.opts)}`);

    this.region = this.opts?.region || this.inputs.props?.region;
    if (_.isNil(this.region)) {
      throw new Error('region not specified, please specify --region');
    }
    this.fcSdk = new FC(this.region, this.inputs.credential as ICredentials, {
      endpoint: inputs.props.endpoint,
      userAgent: `${
        inputs.userAgent ||
        `serverless-devs;Nodejs:${process.version};OS:${process.platform}-${process.arch}`
      }command:logs`,
    });
    this.getApiType = GetApiType.simple;

    this.slsClient = new SLS({
      accessKeyId: this.inputs.credential.AccessKeyID,
      secretAccessKey: this.inputs.credential.AccessKeySecret,
      securityToken: this.inputs.credential.SecurityToken,
      endpoint: `http://${this.region}.log.aliyuncs.com`,
      apiVersion: '2015-06-01',
      // httpOptions: {
      //   timeout: 1000  //1sec, 默认没有timeout
      // },
    });
  }

  async run() {
    // 参数转化处理，尤其是交互兼容处理
    const props = await this.getInputs();
    this.logger.debug(`handler props is: ${JSON.stringify(props)}`);

    if (props.tail) {
      await this.realtime(props);
    } else {
      const historyLogs = await this.history(props);
      this.printLogs(historyLogs, props.match);
    }
  }

  async getInputs(): Promise<IProps> {
    const props: any = this.inputs.props || {};
    const functionName = this.opts?.['function-name'] || props?.functionName;
    if (_.isNil(functionName)) {
      throw new Error('functionName not specified, please specify --function-name');
    }
    const { logConfig } = await this.getFunction(functionName);
    if (_.isNil(logConfig)) {
      throw new Error(
        `logConfig does not exist, you can set the config in yaml or on https://fcnext.console.aliyun.com/${this.region}/functions/${functionName}?tab=logging`,
      );
    }
    this.compareLogConfig(logConfig);

    let { logstore } = logConfig;
    if (_.isArray(logstore)) {
      if (logstore.length === 1) {
        logstore = logstore[0].name;
      } else {
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'logstore',
            message:
              'Multiple logstore names have been detected in your configuration, please select a logstore',
            choices: logstore.map((item) => item.name),
          },
        ]);
        logstore = answers.logstore;
      }
    }

    if (this.opts?.qualifier && this.opts.qualifier === 'LATEST') {
      _.unset(this.opts, 'qualifier');
    }

    let topic: string;
    let query: string;

    if (functionName.indexOf('$') >= 0) {
      topic = functionName.split('$')[0];
      query = functionName.split('$')[1];
    } else {
      topic = `FCLogs:${functionName}`;
      query = this.opts?.query || props?.query;
    }
    logger.debug(topic, query);

    return {
      region: this.region,
      projectName: logConfig.project,
      logStoreName: logstore,
      topic,
      query,
      tail: this.opts?.tail,
      startTime: this.opts?.['start-time'] || new Date().getTime() - 60 * 60 * 1000,
      endTime: this.opts?.['end-time'] || new Date().getTime(),
      search: this.opts?.search || this.opts?.keyword,
      type: this.opts?.type,
      qualifier: this.opts?.qualifier,
      match: this.opts?.match,
      requestId: this.opts?.['request-id'],
      instanceId: this.opts?.['instance-id'],
    };
  }

  async getFunction(functionName: string): Promise<{ error: any } | any> {
    try {
      return await this.fcSdk.getFunction(functionName, this.getApiType);
    } catch (ex) {
      logger.debug(`Get function ${functionName} error: ${ex}`);
      return {
        error: {
          code: ex.code,
          message: ex.message,
        },
      };
    }
  }

  // 判别本地与线上logconfig是否一致，不一致就警告
  compareLogConfig(logConfig: ILogConfig) {
    const localLogConfig = this.inputs.props.logConfig;
    // cli mode
    if (_.isEmpty(localLogConfig)) {
      return;
    }
    // logConfig is auto
    if (typeof localLogConfig === 'string' && localLogConfig.toLocaleLowerCase() === 'auto') {
      if (
        logConfig.project === `${this.inputs.credential.AccountID}-${this.region}-project` &&
        logConfig.logstore === 'function-logstore'
      ) {
        logger.debug('logConfig auto skip warning message');
        return;
      }
    }

    if (JSON.stringify(logConfig) !== JSON.stringify(localLogConfig)) {
      this.logger.warn('Your local logConfig is different from remote, please check it.');
      this.logger.debug(
        `local logConfig=${JSON.stringify(localLogConfig)}, remote logConfig=${JSON.stringify(
          logConfig,
        )}`,
      );
    }
  }

  /**
   * 输出日志
   * @param historyLogs
   * @param match
   */
  printLogs(historyLogs: any[], match) {
    let requestId = '';

    this.logger.debug(`print logs: ${JSON.stringify(historyLogs)}`);
    for (const item of historyLogs) {
      const { message: log, requestId: rid, time, extra } = item;
      if (requestId !== rid) {
        this.logger.log('\n');
        requestId = rid;
      }

      let l = log;

      const tokens = l.split(' ');
      if (tokens.length && DATE_TIME_REG.test(tokens[0])) {
        tokens[0] = `\x1B[1;32m${moment(tokens[0]).format('YYYY-MM-DD HH:mm:ss')}\x1B[0m`;
      }

      if (tokens[2] === '[silly]') {
        tokens.splice(2, 1);
      }
      l = tokens.join(' ');
      // l = _.trim(tokens.join(' '), '\n');

      l = replaceAll(l, 'Error', '\x1B[31mError\x1B[0m');
      l = replaceAll(l, 'ERROR', '\x1B[31mERROR\x1B[0m');
      l = replaceAll(l, 'error', '\x1B[31merror\x1B[0m');

      if (time) {
        l = `\x1B[2m${time}\x1B[0m ${l}`;
      }
      if (extra?.instanceID) {
        const instanceId = extra.instanceID;
        let colorIndex;
        if (instanceIds.has(instanceId)) {
          colorIndex = instanceIds.get(instanceId);
        } else {
          colorIndex = instanceIds.size % COLOR_MAP.length;
          instanceIds.set(instanceId, colorIndex);
        }
        l = `${COLOR_MAP[colorIndex]}${instanceId}\x1B[0m ${l}`;
      }

      // if (extra?.qualifier) {
      //   l = `${extra.qualifier} ${l}`;
      // }

      if (match) {
        l = replaceAll(l, match, `\x1B[43m${match}\x1B[0m`);
      }

      console.log(l);
    }
  }

  /**
   * 获取实时日志
   */
  async realtime({ projectName, logStoreName, topic, query, search, qualifier, match }: IRealtime) {
    let timeStart;
    let timeEnd;
    let times = 1800;

    /**
     * 日志接口最小区间10s，查询间隔为 1s
     * 实现：将 10s 的数据全都请求回来，然后记录输出的时间戳，同一时间戳的输出，输出过的时间戳则过滤掉
     */
    const consumedTimeStamps = [];
    while (times > 0) {
      await sleep(1500);
      times -= 1;

      timeStart = moment().subtract(10, 'seconds').unix();
      timeEnd = moment().unix();
      this.logger.debug(`realtime: ${times}, start: ${timeStart}, end: ${timeEnd}`);

      const pulledlogs = await this.getLogs({
        projectName,
        logStoreName,
        topic,
        query: this.getSlsQuery(query, search, qualifier),
        from: timeStart,
        to: timeEnd,
      });

      if (_.isEmpty(pulledlogs)) {
        continue;
      }

      let showTimestamp = '';

      const notConsumedLogs = _.filter(pulledlogs, (data) => {
        const { timestamp } = data;
        if (consumedTimeStamps.includes(timestamp)) {
          return showTimestamp === timestamp;
        }

        showTimestamp = data.timestamp;
        consumedTimeStamps.push(data.timestamp);
        return true;
      });

      this.printLogs(notConsumedLogs, match);
    }
  }

  /**
   * 获取历史日志
   */
  async history({
    projectName,
    logStoreName,
    topic,
    query,
    search,
    type,
    requestId,
    instanceId,
    qualifier,
    startTime,
    endTime,
  }: IHistory) {
    let from = moment().subtract(20, 'minutes').unix();
    let to = moment().unix();
    if (startTime && endTime) {
      // 支持时间戳和其他时间格式
      const sTime = /^\d+$/g.test(startTime) ? startTime : startTime;
      const eTime = /^\d+$/g.test(endTime) ? endTime : endTime;
      from = Math.floor(new Date(sTime).getTime() / 1000);
      to = Math.floor(new Date(eTime).getTime() / 1000);
    } else {
      // 20 minutes ago
      this.logger.warn('By default, find logs within 20 minutes...\n');
    }
    if (_.isNaN(from) || _.isNaN(to)) {
      throw new Error(TIME_ERROR_TIP);
    }
    const params = {
      from,
      to,
      projectName,
      logStoreName,
      topic,
      query: this.getSlsQuery(query, search, qualifier, requestId, instanceId),
    };
    const logsList = await this.getLogs(params);

    return this.filterByKeywords(logsList, { type });
  }

  /**
   * 生成查询语句
   */
  getSlsQuery(
    query: string,
    search: string,
    qualifier: string,
    requestId?: string,
    instanceId?: string,
  ): string {
    let q = '';
    let hasValue = false;

    if (!_.isNil(query)) {
      q += query;
      hasValue = true;
    }

    if (!_.isNil(search)) {
      q = hasValue ? `${q} and ${search}` : search;
      hasValue = true;
    }

    if (!_.isNil(qualifier)) {
      q = hasValue ? `${q} and ${qualifier}` : qualifier;
      hasValue = true;
    }

    if (!_.isNil(instanceId)) {
      q = hasValue ? `${q} and ${instanceId}` : instanceId;
      hasValue = true;
    }

    if (!_.isNil(requestId)) {
      q = hasValue ? `${q} and ${requestId}` : requestId;
    }

    return q;
  }

  /**
   * 获取日志
   */
  async getLogs(requestParams: IGetLogs, tabReplaceStr = '\n') {
    this.logger.debug(`get logs params: ${JSON.stringify(requestParams)}`);
    let count;
    let xLogCount;
    let xLogProgress = 'Complete';

    let result = [];

    do {
      const response: any = await new Promise((resolve, reject) => {
        this.slsClient.getLogs(requestParams, (error, data) => {
          if (error) {
            reject(error);
          }
          resolve(data);
        });
      });
      const { body } = response;

      if (_.isEmpty(body)) {
        continue;
      }

      count = _.keys(body).length;

      xLogCount = response.headers['x-log-count'];
      xLogProgress = response.headers['x-log-progress'];

      let requestId;
      result = _.concat(
        result,
        _.values(body).map((cur) => {
          const currentMessage = cur.message || '';
          const found = currentMessage.match('(\\w{8}(-\\w{4}){3}-\\w{12}?)');

          if (!_.isEmpty(found)) {
            requestId = found[0];
          }

          // TODO: custom 不一定存在 requestId
          if (currentMessage.includes('FC Invoke Start')) {
            requestId = currentMessage.replace('FC Invoke Start RequestId: ', '');
          }

          if (requestId) {
            requestId = _.trim(requestId);
          }

          return {
            requestId,
            timestamp: cur.__time__,
            time: moment.unix(cur.__time__).format('YYYY-MM-DD H:mm:ss'),
            message: _.trim(currentMessage, '\n').replace(new RegExp(/(\r)/g), tabReplaceStr),
            extra: {
              instanceID: cur.instanceID,
              functionName: cur.functionName,
              qualifier: cur.qualifier,
              versionId: cur.versionId,
            },
          };
        }, {}),
      );
    } while (xLogCount !== count && xLogProgress !== 'Complete');

    return result;
  }

  /**
   * 过滤日志信息
   */
  private filterByKeywords(logsList = [], { type }) {
    const logsClone = _.cloneDeep(logsList);

    const queryErrorLog = type === 'failed' || type === 'fail';
    if (queryErrorLog || type === 'success') {
      const errorRequestIds: string[] = [];
      _.forEach(logsClone, (value) => {
        const curRequestId = value.requestId;
        if (!curRequestId || errorRequestIds.includes(curRequestId)) {
          return;
        }
        const curMessage = value.message;
        const isError = curMessage?.includes(' [ERROR] ') || curMessage?.includes('Error: ');
        if (isError) {
          errorRequestIds.push(curRequestId);
        }
      });
      if (queryErrorLog) {
        return _.filter(logsClone, (value) => errorRequestIds.includes(value.requestId));
      }
      return _.filter(logsClone, (value) => !errorRequestIds.includes(value.requestId));
    }
    return logsClone;
  }
}
