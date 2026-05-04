import { parseArgv } from '@serverless-devs/utils';
import { IInputs, IRegion, checkRegion } from '../../interface';
import logger from '../../logger';
import _ from 'lodash';
import FC from '../../resources/fc';
import { getUserAgent, tableShow } from '../../utils';

const LIST_TABLE_KEYS = [
  'functionName',
  'runtime',
  'handler',
  'memorySize',
  'state',
  'lastModifiedTime',
];

export default class List {
  private region: IRegion;
  private fcSdk: FC;
  private opts: any;

  constructor(readonly inputs: IInputs) {
    const opts = parseArgv(inputs.args, {
      alias: { help: 'h' },
      boolean: ['help', 'table'],
      string: ['region', 'prefix', 'limit', 'next-token'],
    });

    logger.debug(`list opts: ${JSON.stringify(opts)}`);

    const { region } = opts;
    this.region = region || _.get(inputs, 'props.region', '');
    checkRegion(this.region);

    const userAgent = getUserAgent(inputs.userAgent, 'list');
    this.fcSdk = new FC(this.region, inputs.credential, {
      endpoint: inputs.props.endpoint,
      userAgent,
    });

    this.opts = opts;
  }

  async run() {
    const { limit, prefix } = this.opts;
    const nextToken = this.opts['next-token'];

    if (limit) {
      const parsedLimit = parseInt(limit, 10);
      if (!parsedLimit || parsedLimit < 1) {
        throw new Error('--limit must be a positive integer');
      }
      const body = await this.fcSdk.listFunctionsPage(parsedLimit, prefix, nextToken);

      if (this.opts.table) {
        tableShow(body.functions || [], LIST_TABLE_KEYS);
        return;
      }
      return body;
    }

    const functions = await this.fcSdk.listFunctions(prefix);

    if (this.opts.table) {
      tableShow(functions || [], LIST_TABLE_KEYS);
      return;
    }
    return { functions };
  }
}
