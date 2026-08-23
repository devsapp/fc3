import { parseArgv } from '@serverless-devs/utils';
import { IInputs, IRegion, checkRegion } from '../../interface';
import logger from '../../logger';
import _ from 'lodash';
import FC from '../../resources/fc';
import {
  MAX_DEFAULT_RENDER_LINES,
  estimateRenderLines,
  getUserAgent,
  isAppCenter,
  isDefaultRenderOutput,
  tableShow,
} from '../../utils';

interface IListResult {
  functions?: unknown[];
  nextToken?: string;
}

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
      return this.output(body);
    }

    const functions = await this.fcSdk.listFunctions(prefix);

    if (this.opts.table) {
      tableShow(functions || [], LIST_TABLE_KEYS);
      return;
    }
    return this.output({ functions });
  }

  /**
   * 函数数量很多时，CLI 内核默认的 prettyjson 渲染器会因为参数个数超限抛
   * RangeError: Maximum call stack size exceeded，这里直接打印 JSON 兜底。
   * 只有真实 CLI 走 prettyjson 渲染，app center 等程序化调用方依赖返回值，原样返回。
   */
  private output(result: IListResult): IListResult | undefined {
    if (
      isAppCenter() ||
      !isDefaultRenderOutput() ||
      estimateRenderLines(result) <= MAX_DEFAULT_RENDER_LINES
    ) {
      return result;
    }

    logger.warn(
      `Got ${
        (result.functions || []).length
      } functions, too large for the default output format. Printing raw JSON instead, use --limit/--next-token to paginate, --table for a summary, or -o json/yaml to pick the output format.`,
    );
    logger.write(JSON.stringify(result, null, 2));
  }
}
