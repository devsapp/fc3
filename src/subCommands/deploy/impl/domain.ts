import _ from 'lodash';
import { IDomain, IInputs } from '../../../interface';
import Base from './base';
import logger from '../../../logger';

interface IOpts {
  yes: boolean | undefined;
  domain: boolean | string | undefined;
}

export default class Domain extends Base {
  local: IDomain[];
  remote: any[] = [];
  readonly functionName: string;

  constructor(inputs: IInputs, opts: IOpts) {
    super(inputs, opts.yes);
    this.functionName = inputs.props.function?.functionName;

    const local = _.cloneDeep(_.get(inputs, 'props.customDomains', []));
    const domainNames = local.map((item) => item.domainName);
    if (_.isString(opts.domain) && opts.domain !== '') {
      const onlyDeployDomain = opts.domain.split(',');
      // 判断指定的配置是否存在参数中
      const difference = _.difference(onlyDeployDomain, domainNames);
      if (!_.isEmpty(difference)) {
        logger.error(`Domain names '${difference.join("','")}' are not allowed in domain config`);
      }

      // 仅保留yaml中配置的参数
      const intersection = _.intersection(domainNames, onlyDeployDomain);
      logger.debug(`need deploy domain names: ${intersection}`);
      this.local = _.filter(local, (item) => intersection.includes(item.domainName));
    } else {
      this.local = local;
    }
    // TODO: domain
  }

  async before(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async run(): Promise<any> {
    throw new Error('Method not implemented.');
  }
}
