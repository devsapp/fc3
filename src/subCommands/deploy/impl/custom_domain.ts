import _ from 'lodash';
import { IInputs } from '../../../interface';
import { IInputs as _IInputs } from '@serverless-devs/component-interface';
import loadComponent from '@serverless-devs/load-component';
import logger from '../../../logger';
import Base from './base';
import { transformCustomDomainProps } from '../../../utils';
import { FC3_DOMAIN_COMPONENT_NAME } from '../../../constant';

interface IOpts {
  yes: boolean | undefined;
}

export default class CustomDomain extends Base {
  local: any;
  domainInstance: any;
  customDomainInputs: _IInputs;
  readonly functionName: string;

  constructor(inputs: IInputs, opts: IOpts) {
    super(inputs, opts.yes);
    this.functionName = inputs.props?.functionName;

    const customDomain = _.get(inputs, 'props.customDomain', {});
    this.local = _.cloneDeep(customDomain);
    logger.debug(`customDomain input props: ${JSON.stringify(customDomain)}`);
  }

  async _handle_custom_domain() {
    this.domainInstance = await loadComponent(FC3_DOMAIN_COMPONENT_NAME, { logger });
    this.customDomainInputs = _.cloneDeep(this.inputs) as _IInputs;
    const customDomain = _.get(this.inputs.props, 'customDomain', {});
    const local = _.cloneDeep(customDomain) as any;
    const { region } = this.inputs.props;
    let props = { region } as any;
    if (!_.isEmpty(this.local)) {
      props = transformCustomDomainProps(local, region, this.functionName);
    }
    this.customDomainInputs.props = props;
  }

  async before() {
    await this._handle_custom_domain();
  }

  async run() {
    if (_.isEmpty(this.local)) {
      return true;
    }
    const infoInput = _.cloneDeep(this.customDomainInputs);
    let { domainName } = this.customDomainInputs.props;
    const deployInput = _.cloneDeep(this.customDomainInputs);
    try {
      const onlineCustomDomain = await this.domainInstance.info(infoInput);
      // console.log(JSON.stringify(onlineCustomDomain, null, 2));
      let routes = onlineCustomDomain?.routeConfig?.routes;
      if (!routes) {
        routes = [];
      }
      let found = false;
      if (routes) {
        domainName = onlineCustomDomain.domainName;
        const myRoute = this.local.route;
        for (let i = 0; i < routes.length; i++) {
          const route = routes[i];
          if (route.functionName !== this.functionName && route.path === myRoute.path) {
            throw new Error(
              `${domainName} ==> path ${route.path} is used by other function: ${route.functionName}`,
            );
          }
          if (route.functionName === this.functionName && route.path === myRoute.path) {
            found = true;
            if (_.isEmpty(myRoute.methods)) {
              routes[i].methods = [];
            }
          }
        }
      }
      if (!found) {
        const myRoute = _.cloneDeep(this.local.route);
        myRoute.functionName = this.functionName;
        routes.push(myRoute);
      }
      if (!deployInput.props.routeConfig) {
        deployInput.props.routeConfig = { routes: [] };
      }
      deployInput.props.routeConfig.routes = routes;

      if (this.local.protocol.toUpperCase() === 'HTTP') {
        if (onlineCustomDomain.protocol.toUpperCase() === 'HTTPS') {
          deployInput.props.protocol = 'HTTP,HTTPS';
        } else {
          deployInput.props.protocol = onlineCustomDomain.protocol;
        }
      }

      if (!_.isEmpty(this.local.certConfig)) {
        deployInput.props.certConfig = this.local.certConfig;
      } else if (!_.isEmpty(onlineCustomDomain.certConfig)) {
        deployInput.props.certConfig = onlineCustomDomain.certConfig;
      }

      if (!_.isEmpty(this.local.tlsConfig)) {
        deployInput.props.tlsConfig = this.local.tlsConfig;
      } else if (!_.isEmpty(onlineCustomDomain.tlsConfig)) {
        deployInput.props.tlsConfig = onlineCustomDomain.tlsConfig;
      }

      if (!_.isEmpty(this.local.authConfig)) {
        deployInput.props.authConfig = this.local.authConfig;
      } else if (!_.isEmpty(onlineCustomDomain.authConfig)) {
        deployInput.props.authConfig = onlineCustomDomain.authConfig;
      }

      if (!_.isEmpty(this.local.wafConfig)) {
        deployInput.props.wafConfig = this.local.wafConfig;
      } else if (!_.isEmpty(onlineCustomDomain.wafConfig)) {
        deployInput.props.wafConfig = onlineCustomDomain.wafConfig;
      }
    } catch (e) {
      logger.debug(e.message);
      if (!e.message.includes('DomainNameNotFound')) {
        throw e;
      }
    }
    deployInput.props.domainName = domainName;
    const id = `${this.functionName}/${domainName}`;
    logger.info(
      `deploy ${id}, deployInput props = \n${JSON.stringify(deployInput.props, null, 2)}`,
    );
    return await this.domainInstance.deploy(deployInput);
  }
}
