/* eslint-disable no-param-reassign */
/* eslint-disable no-template-curly-in-string */
/* eslint-disable no-useless-escape */

import _ from 'lodash';
import { IInputs, IRegion } from '../../interface';
import logger from '../../logger';
import { parseArgv } from '@serverless-devs/utils';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import path from 'path';

export default class SYaml2To3 {
  readonly region: IRegion;
  opts: any;
  baseDir: string;
  source: string;
  target: string;

  constructor(inputs: IInputs) {
    const opts = parseArgv(inputs.args, {
      alias: { help: 'h' },
      boolean: ['help'],
      string: ['region', 'source', 'target'],
    });
    logger.debug(`layer opts: ${JSON.stringify(opts)}`);
    this.opts = opts;
    this.baseDir = inputs.baseDir || process.cwd();
    logger.debug(`baseDir is: ${this.baseDir}`);
    let { source, target } = this.opts;
    source = source || this.getSYamlFile();
    target = target || 's3.yaml';
    logger.debug(source, target);

    if (_.isEmpty(source)) {
      const msg =
        'source not specified and s.yaml or s.yml is not in current dir, please specify --source';
      logger.error(msg);
      throw new Error(msg);
    }
    this.source = path.isAbsolute(source) ? source : path.join(this.baseDir, source);
    this.target = path.isAbsolute(target) ? target : path.join(this.baseDir, target);
  }

  getSYamlFile() {
    const filenames = ['s.yaml', 's.yml'];
    for (const filename of filenames) {
      try {
        fs.accessSync(filename, fs.constants.F_OK);
        return filename;
      } catch (err) {
        // eslint-disable-next-line no-empty
      }
    }
    return '';
  }

  /*
  1. s 内置 env、file 和 config, 比如 ${env(A)} 需要替换成 ${env('A')}
      ${env("A")} and ${env('B')} and ${env(C)}   ---->  ${env('A')} and ${env('B')} and ${env('C')}
  2. ${A.output.xx} 需要转成 ${resources.A.output.xx}
  */
  variableReplace(fileContents: string) {
    const regex = /\${env\((["']?)(.*?)\1\)}/g;
    const r1 = fileContents.replace(regex, (_a, quote, variableName) => {
      return `\${env('${variableName}')}`;
    });

    const regex2 = /\${config\((["']?)(.*?)\1\)}/g;
    const r2 = r1.replace(regex2, (_a, quote, variableName) => {
      return `\${config('${variableName}')}`;
    });

    const regex3 = /\${file\((["']?)(.*?)\1\)}/g;
    const r3 = r2.replace(regex3, (_a, quote, variableName) => {
      return `\${file('${variableName}')}`;
    });

    // ${A.output.xx} 需要转成 ${resources.A.output.xx}
    // ${A.props.xx} 需要转成 ${resources.A.props.xx}
    const regex4 = /\$\{([^}]+)\}/g;
    const result = r3.replace(regex4, (_a, variableName) => {
      if (variableName.includes('.output')) {
        const parts = variableName.split('.');
        const resourceIndex = parts.findIndex((part) => part.endsWith('output'));
        if (resourceIndex !== -1) {
          const resourceName = parts[resourceIndex - 1];
          parts.splice(resourceIndex - 1, 2, 'resources', resourceName, 'output');
          return `\${${parts.join('.')}}`;
        }
      }
      if (variableName.includes('.props') && !variableName.includes('this.props')) {
        const parts = variableName.split('.');
        const resourceIndex = parts.findIndex((part) => part.endsWith('props'));
        if (resourceIndex !== -1) {
          const resourceName = parts[resourceIndex - 1];
          parts.splice(resourceIndex - 1, 2, 'resources', resourceName, 'props');
          return `\${${parts.join('.')}}`;
        }
      }
      return _a;
    });

    logger.debug(`variableReplace ====> \n${result}`);

    return result;
  }

  async run() {
    logger.info(`transform ${this.source}  =====>  ${this.target}`);
    const fileContents = fs.readFileSync(this.source, 'utf8');
    const refineFileContents = this.variableReplace(fileContents);
    // eslint-disable-next-line prefer-const
    let parsedYamlData = yaml.load(refineFileContents);
    parsedYamlData.edition = '3.0.0';
    parsedYamlData.resources = parsedYamlData.services;
    _.unset(parsedYamlData, 'services');
    this._transform(parsedYamlData);
    const yamlStr = yaml.dump(parsedYamlData);
    fs.writeFileSync(this.target, yamlStr);
  }

  private _transform(parsedYamlData: any) {
    this._handle_fc(parsedYamlData);
    // TODO: 处理 fc-domain 的转换

    // resources key 放在最后
    const res = _.cloneDeep(parsedYamlData.resources);
    _.unset(parsedYamlData, 'resources');
    parsedYamlData.resources = res;
  }

  // 处理 fc 2.0 中 service 属性
  private _handle_fc_service(serviceProps: any) {
    // 处理 nas mount config
    if (_.get(serviceProps, 'nasConfig')) {
      const { nasConfig } = serviceProps;
      if (typeof nasConfig === 'string' && nasConfig.toLocaleLowerCase() === 'auto') {
        serviceProps.nasConfig = 'auto';
      } else {
        const { mountPoints } = nasConfig;
        for (let i = 0; i < mountPoints.length; i++) {
          const mountPoint = mountPoints[i];
          mountPoint.serverAddr = `${mountPoint.serverAddr}:${mountPoint.nasDir}`;
          mountPoint.mountDir = mountPoint.fcDir;
          _.unset(mountPoint, 'fcDir');
          _.unset(mountPoint, 'nasDir');
        }
      }
    }
    // 处理 vpc config
    if (_.get(serviceProps, 'vpcConfig')) {
      // 处理 2.0 时代 vswitchIds 和 vSwitchIds 都可以的情况
      if (_.has(serviceProps, 'vpcConfig.vswitchIds')) {
        serviceProps.vpcConfig.vSwitchIds = serviceProps.vpcConfig.vswitchIds;
        _.unset(serviceProps.vpcConfig, 'vswitchIds');
      }
    }

    // 处理 vpc binding
    if (_.get(serviceProps, 'vpcBinding')) {
      const vpcIds = serviceProps.vpcBinding;
      serviceProps.vpcBinding = { vpcIds };
    }
  }

  // 处理 fc 组件的转换
  private _handle_fc(parsedYamlData: any) {
    const { resources } = parsedYamlData;
    const toDelServiceKeys = [];
    for (const k of Object.keys(resources)) {
      const v = resources[k];
      const cp = v.component as string;
      if (
        !(
          cp === 'fc' ||
          cp === 'devsapp/fc' ||
          cp.startsWith('fc@') ||
          cp.startsWith('devsapp/fc@')
        )
      ) {
        continue;
      }
      // 只处理 fc 组件的内容
      v.component = 'fc3';
      const service = _.cloneDeep(v.props.service);
      let srv: any = {};
      if (typeof service === 'string') {
        const key = service.replace('${', '').replace('}', '');
        srv = _.cloneDeep(_.get(parsedYamlData, key));
        toDelServiceKeys.push(key);
      } else {
        srv = _.get(v.props, 'service') || {};
      }
      _.unset(v.props, 'service');

      const serviceName = srv.name;
      _.unset(srv, 'name');
      _.unset(srv, 'description');
      const func = _.cloneDeep(v.props.function);
      _.unset(v.props, 'function');

      if (typeof service === 'string') {
        if (!_.isEmpty(srv)) {
          const templateName = `template_${serviceName}`;
          v.extend = { name: templateName };
          if (!_.get(parsedYamlData, 'template')) {
            parsedYamlData.template = {};
          }
          if (!_.get(parsedYamlData.template, templateName)) {
            this._handle_fc_service(srv);
            parsedYamlData.template[templateName] = srv;
          }
        }
        v.props = { ...v.props, ...func };
      } else {
        v.props = { ...v.props, ...func, ...srv };
      }

      v.props.functionName = `${serviceName}\$${v.props.name}`;
      _.unset(v.props, 'name');

      v.props.code = v.props.codeUri;
      _.unset(v.props, 'codeUri');
      if (_.get(v.props, 'ossBucket')) {
        v.props.code = {
          ossBucketName: v.props.ossBucket,
          ossObjectName: v.props.ossKey,
        };
        _.unset(v.props, 'ossBucket');
        _.unset(v.props, 'ossKey');
      }

      _.unset(v.props, 'instanceType');

      if (_.get(v.props, 'asyncConfiguration')) {
        v.props.asyncInvokeConfig = v.props.asyncConfiguration;
        _.unset(v.props, 'asyncConfiguration');
        const { asyncInvokeConfig } = v.props;
        _.unset(asyncInvokeConfig, 'statefulInvocation');
        if (_.get(asyncInvokeConfig, 'destination')) {
          asyncInvokeConfig.destinationConfig = asyncInvokeConfig.destination;
          _.unset(asyncInvokeConfig, 'destination');
          const { destinationConfig } = asyncInvokeConfig;
          if (_.get(destinationConfig, 'onSuccess')) {
            const succ = destinationConfig.onSuccess;
            // if (succ.startsWith('acs:fc')) {
            //   succ = `${succ.split('services/')[0]}functions/${succ.split('functions/')[1]}`;
            //   if (succ.startsWith('acs:fc:::')) {
            //     succ = succ.replace('acs:fc:::', 'acs:fc:${this.props.region}::');
            //   }
            // }
            destinationConfig.onSuccess = {
              destination: succ,
            };
          }
          if (_.get(destinationConfig, 'onFailure')) {
            const fail = destinationConfig.onFailure;
            // if (fail.startsWith('acs:fc')) {
            //   fail = `${fail.split('services/')[0]}functions/${fail.split('functions/')[1]}`;
            //   if (fail.startsWith('acs:fc:::')) {
            //     fail = fail.replace('acs:fc:::', 'acs:fc:${this.props.region}::');
            //   }
            // }
            destinationConfig.onFailure = {
              destination: fail,
            };
          }
        }
      }

      this._handle_fc_service(v.props);

      // 处理 custom runtime 和 custom-container runtime
      if (_.get(v.props, 'caPort')) {
        if (_.get(v.props, 'customContainerConfig')) {
          v.props.customContainerConfig.port = v.props.caPort;
        }
        if (_.get(v.props, 'customRuntimeConfig')) {
          v.props.customRuntimeConfig.port = v.props.caPort;
        }
        _.unset(v.props, 'caPort');
      }

      if (_.get(v.props, 'customHealthCheckConfig')) {
        if (_.get(v.props, 'customContainerConfig')) {
          v.props.customContainerConfig.healthCheckConfig = v.props.customHealthCheckConfig;
        }
        if (_.get(v.props, 'customRuntimeConfig')) {
          v.props.customRuntimeConfig.healthCheckConfig = v.props.customHealthCheckConfig;
        }
        _.unset(v.props, 'customHealthCheckConfig');
      }

      if (_.get(v.props, 'customContainerConfig')) {
        if (!_.isEmpty(v.props.customContainerConfig.command)) {
          v.props.customContainerConfig.entrypoint = v.props.customContainerConfig.command;
        }
        _.unset(v.props.customContainerConfig, 'command');
        if (!_.isEmpty(v.props.customContainerConfig.args)) {
          v.props.customContainerConfig.command = v.props.customContainerConfig.args;
        }
        _.unset(v.props.customContainerConfig, 'args');

        //  instanceID and accelerationType is not needed in fc3.0
        _.unset(v.props.customContainerConfig, 'instanceID');
        _.unset(v.props.customContainerConfig, 'accelerationType');
        _.unset(v.props.customContainerConfig, 'accelerationInfo');
        if (v.props.customContainerConfig.webServerMode === false) {
          logger.warn(`resource ${k} NoWebServerMode is not supported in fc3`);
        }
        _.unset(v.props.customContainerConfig, 'webServerMode');
      }

      if (_.get(v.props, 'customRuntimeConfig')) {
        if (_.isEmpty(v.props.customRuntimeConfig.command)) {
          _.unset(v.props.customRuntimeConfig, 'command');
        }

        if (_.isEmpty(v.props.customRuntimeConfig.args)) {
          _.unset(v.props.customRuntimeConfig, 'args');
        }
      }

      // 处理 lifecycle
      if (_.get(v.props, 'initializer')) {
        v.props.instanceLifecycleConfig = v.props.instanceLifecycleConfig || {};
        v.props.instanceLifecycleConfig.initializer = {
          handler: v.props.initializer,
          timeout: v.props.initializationTimeout,
        };
        _.unset(v.props, 'initializer');
        _.unset(v.props, 'initializationTimeout');
      }
      if (_.get(v.props, 'instanceLifecycleConfig.preFreeze')) {
        logger.error('preFreeze lifecycle is not supported in fc3.0');
        _.unset(v.props, 'instanceLifecycleConfig.preFreeze');
      }

      // 处理 triggers
      if (_.get(v.props, 'triggers')) {
        const { triggers } = v.props;
        for (let i = 0; i < triggers.length; i++) {
          const t = triggers[i];
          t.triggerName = t.name;
          _.unset(t, 'name');
          t.triggerType = t.type;
          _.unset(t, 'type');
          t.triggerConfig = t.config;
          _.unset(t, 'config');
          if (_.get(t, 'role')) {
            t.invocationRole = t.role;
            _.unset(t, 'role');
          }
          if (t.triggerType === 'oss') {
            // oss trigger trigger Config 特殊处理
            const { triggerConfig } = t;
            triggerConfig.filter.key = triggerConfig.filter.Key;
            _.unset(triggerConfig.filter, 'Key');

            triggerConfig.filter.key.prefix = triggerConfig.filter.key.Prefix;
            triggerConfig.filter.key.suffix = triggerConfig.filter.key.Suffix;
            _.unset(triggerConfig.filter.key, 'Prefix');
            _.unset(triggerConfig.filter.key, 'Suffix');

            if (_.get(triggerConfig, 'bucketName')) {
              const bucketName = _.get(triggerConfig, 'bucketName');
              // eslint-disable-next-line no-useless-escape
              t.sourceArn = `acs:oss:\$\{this.props.region\}:\$\{config("AccountID")\}:${bucketName}`;
              _.unset(triggerConfig, 'bucketName');
            }
          }
        }

        // triggers key 放在最后
        const ts = _.cloneDeep(v.props.triggers);
        _.unset(v.props, 'triggers');
        v.props.triggers = ts;
      }

      // 处理 custom domain
      if (_.get(v.props, 'customDomains')) {
        const { customDomains } = v.props;
        for (let i = 0; i < customDomains.length; i++) {
          const c = customDomains[i];
          const domainId = `fc3_domain_${i}`;
          resources[domainId] = {
            component: 'fc3-domain',
            props: {
              region: v.props.region,
            },
          };
          const { routeConfigs } = c;
          _.unset(c, 'routeConfigs');
          resources[domainId].props = { ...resources[domainId].props, ...c };
          resources[domainId].props.routeConfig = { routes: [] };
          for (let j = 0; j < routeConfigs.length; j++) {
            const routeConfig = routeConfigs[j];
            _.unset(routeConfig, 'serviceName');
            routeConfig.functionName = routeConfig.functionName || v.props.functionName;
            resources[domainId].props.routeConfig.routes.push(routeConfig);
          }
        }
        _.unset(v.props, 'customDomains');
      }

      // 处理 actions
      if (_.get(v, 'actions')) {
        const { actions } = v;
        for (const key of Object.keys(actions)) {
          const action = actions[key];
          if (!action) {
            _.unset(actions, key);
            continue;
          }
          console.log(`action: ${key}: ${JSON.stringify(action)}`);
          for (let i = 0; i < action.length; i++) {
            const acV = action[i];
            if ('component' in acV) {
              let cV = acV.component.split(' ').filter(Boolean).join(' ');
              if (cV.startsWith('fc build --use-docker') || cV.startsWith('fc build')) {
                cV = cV.replace('fc build --use-docker', 'fc3 build');
                cV = cV.replace('fc build', 'fc3 build');
              } else if (cV.startsWith('fc invoke')) {
                cV = cV.replace('fc invoke', 'fc3 invoke');
                if (cV !== 'fc3 invoke') {
                  logger.warn(
                    `You can use --function-name specify function, for example: fc3 invoke --function-name \${this.props.functionName}, position:\n${k} --->  ${cV}`,
                  );
                }
              } else if (cV.startsWith('fc api') || cV.includes('${vars.service')) {
                logger.warn(
                  `You may need to review and make adjustments to this action as it uses the deprecated version of FC API, involving service operations. position:\n${k} --->  ${cV}`,
                );
              }
              acV.component = cV;
            }
          }
        }
      }
    }

    for (const key of toDelServiceKeys) {
      const varSrv = _.get(parsedYamlData, key);
      const { name, description } = varSrv;
      _.set(parsedYamlData, key, { name, description });
    }
  }
}
