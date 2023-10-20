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
      } catch (err) {}
    }
    return '';
  }

  async run() {
    logger.info(`transform ${this.source}  =====>  ${this.target}`);
    const fileContents = fs.readFileSync('s.yaml', 'utf8');
    let parsedYamlData = yaml.load(fileContents);
    parsedYamlData['edition'] = '3.0.0';
    parsedYamlData['resources'] = parsedYamlData['services'];
    _.unset(parsedYamlData, 'services');
    this._transform(parsedYamlData);
    const yamlStr = yaml.dump(parsedYamlData);
    fs.writeFileSync(this.target, yamlStr);
  }

  private _transform(parsedYamlData: any) {
    let resources = parsedYamlData['resources'];
    for (let k in resources) {
      let v = resources[k];
      const cp = v['component'] as string;
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
      v['component'] = 'fc3';
      let service = _.cloneDeep(v['props']['service']);
      let srv = {};
      if (typeof service === 'string') {
        let key = service.replace('${', '').replace('}', '');
        let kLi = key.split('.');
        srv = parsedYamlData;
        for (let i = 0; i < kLi.length; i++) {
          srv = srv[kLi[i]];
        }
        //console.info(`${service} ====> ${JSON.stringify(srv)}`);
        _.unset(parsedYamlData, key);
      } else {
        srv = _.get(v.props, 'service') || {};
      }
      _.unset(v.props, 'service');

      // 去掉 service name 和 desc, 只使用 function 的name 和 desc 作为  fc3.0 的 functionName 和 desc
      _.unset(srv, 'name');
      _.unset(srv, 'description');

      let func = _.cloneDeep(v['props']['function']);
      _.unset(v.props, 'function');
      v.props = { ...v.props, ...func, ...srv };

      v.props['functionName'] = v.props['name'];
      _.unset(v.props, 'name');

      v.props['code'] = v.props['codeUri'];
      _.unset(v.props, 'codeUri');
      if (_.get(v.props, 'ossBucket')) {
        v.props['code'] = {
          ossBucketName: v.props['ossBucket'],
          ossObjectName: v.props['ossKey'],
        };
        _.unset(v.props, 'ossBucket');
        _.unset(v.props, 'ossKey');
      }

      _.unset(v.props, 'instanceType');

      if (_.get(v.props, 'asyncConfiguration')) {
        v.props['asyncInvokeConfig'] = v.props['asyncConfiguration'];
        _.unset(v.props, 'asyncConfiguration');
        let asyncInvokeConfig = v.props['asyncInvokeConfig'];
        //_.unset(asyncInvokeConfig, 'statefulInvocation');
        if (_.get(asyncInvokeConfig, 'destination')) {
          asyncInvokeConfig['destinationConfig'] = asyncInvokeConfig['destination'];
          _.unset(asyncInvokeConfig, 'destination');

          let destinationConfig = asyncInvokeConfig['destinationConfig'];
          if (_.get(destinationConfig, 'onSuccess')) {
            let succ = destinationConfig['onSuccess'];
            if (succ.startsWith('acs:fc')) {
              succ = succ.split('services/')[0] + 'functions/' + succ.split('functions/')[1];
              if (succ.startsWith('acs:fc:::')) {
                succ = succ.replace('acs:fc:::', 'acs:fc:${this.props.region}::');
              }
            }
            destinationConfig['onSuccess'] = {
              destination: succ,
            };
          }
          if (_.get(destinationConfig, 'onFailure')) {
            let fail = destinationConfig['onFailure'];
            if (fail.startsWith('acs:fc')) {
              fail = fail.split('services/')[0] + 'functions/' + fail.split('functions/')[1];
              if (fail.startsWith('acs:fc:::')) {
                fail = fail.replace('acs:fc:::', 'acs:fc:${this.props.region}::');
              }
            }
            destinationConfig['onFailure'] = {
              destination: fail,
            };
          }
        }
      }
      // 处理 nas mount config
      if (_.get(v.props, 'nasConfig')) {
        let mountPoints = v.props['nasConfig']['mountPoints'];
        for (let i = 0; i < mountPoints.length; i++) {
          let mountPoint = mountPoints[i];
          mountPoint['serverAddr'] = mountPoint['serverAddr'] + ':' + mountPoint['nasDir'];
          mountPoint['mountDir'] = mountPoint['fcDir'];
          _.unset(mountPoint, 'fcDir');
          _.unset(mountPoint, 'nasDir');
        }
      }

      // 处理 custom runtime 和 custom-container runtime
      if (_.get(v.props, 'caPort')) {
        if (_.get(v.props, 'customContainerConfig')) {
          v.props['customContainerConfig']['port'] = v.props['caPort'];
        }
        if (_.get(v.props, 'customRuntimeConfig')) {
          v.props['customRuntimeConfig']['port'] = v.props['caPort'];
        }
        _.unset(v.props, 'caPort');
      }

      if (_.get(v.props, 'customHealthCheckConfig')) {
        if (_.get(v.props, 'customContainerConfig')) {
          v.props['customContainerConfig']['healthCheckConfig'] =
            v.props['customHealthCheckConfig'];
        }
        if (_.get(v.props, 'customRuntimeConfig')) {
          v.props['customRuntimeConfig']['healthCheckConfig'] = v.props['customHealthCheckConfig'];
        }
        _.unset(v.props, 'customHealthCheckConfig');
      }
      if (_.get(v.props, 'customContainerConfig')) {
        v.props['customContainerConfig']['entrypoint'] =
          v.props['customContainerConfig']['command'];
        _.unset(v.props['customContainerConfig'], 'command');
        v.props['customContainerConfig']['command'] = v.props['customContainerConfig']['args'];
        _.unset(v.props['customContainerConfig'], 'args');

        //  instanceID and accelerationType is not needed in fc3.0
        _.unset(v.props['customContainerConfig'], 'instanceID');
        _.unset(v.props['customContainerConfig'], 'accelerationType');
      }

      // 处理 lifecycle
      if (_.get(v.props, 'initializer')) {
        v.props['instanceLifecycleConfig'] = v.props['instanceLifecycleConfig'] || {};
        v.props['instanceLifecycleConfig']['initializer'] = {
          handler: v.props['initializer'],
          timeout: v.props['initializationTimeout'],
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
        let triggers = v.props['triggers'];
        for (let i = 0; i < triggers.length; i++) {
          let t = triggers[i];
          t['triggerName'] = t['name'];
          _.unset(t, 'name');
          t['triggerType'] = t['type'];
          _.unset(t, 'type');
          t['triggerConfig'] = t['config'];
          _.unset(t, 'config');
          if (_.get(t, 'role')) {
            t['invocationRole'] = t['role'];
            _.unset(t, 'role');
          }
          if (t['triggerType'] === 'oss') {
            // oss trigger trigger Config 特殊处理
            let triggerConfig = t['triggerConfig'];
            triggerConfig['filter']['key'] = triggerConfig['filter']['Key'];
            _.unset(triggerConfig['filter'], 'Key');

            triggerConfig['filter']['key']['prefix'] = triggerConfig['filter']['key']['Prefix'];
            triggerConfig['filter']['key']['suffix'] = triggerConfig['filter']['key']['Suffix'];
            _.unset(triggerConfig['filter']['key'], 'Prefix');
            _.unset(triggerConfig['filter']['key'], 'Suffix');

            if (_.get(triggerConfig, 'bucketName')) {
              const bucketName = _.get(triggerConfig, 'bucketName');
              t[
                'sourceArn'
              ] = `acs:oss:\$\{this.props.region\}:\$\{config("AccountID")\}:${bucketName}`;
              _.unset(triggerConfig, 'bucketName');
            }
          }
        }
      }

      // 处理 custom domain
      if (_.get(v.props, 'customDomains')) {
        let customDomains = v.props['customDomains'];
        for (let i = 0; i < customDomains.length; i++) {
          let c = customDomains[i];
          const domainId = `fc3_domain_${i}`;
          resources[domainId] = {
            component: 'fc3-domain',
            props: {
              region: v.props['region'],
            },
          };
          let routeConfigs = c['routeConfigs'];
          _.unset(c, 'routeConfigs');
          resources[domainId]['props'] = { ...resources[domainId]['props'], ...c };
          resources[domainId]['props']['routeConfig'] = { routes: [] };
          for (let i = 0; i < routeConfigs.length; i++) {
            let routeConfig = routeConfigs[i];
            _.unset(routeConfig, 'serviceName');
            if (_.get(routeConfig, 'functionName')) {
              routeConfig['functionName'] = routeConfig['functionName'];
            } else {
              routeConfig['functionName'] = v.props['functionName'];
            }
            resources[domainId]['props']['routeConfig']['routes'].push(routeConfig);
          }
        }
        _.unset(v.props, 'customDomains');
      }

      // 处理 actions
      if (_.get(v, 'actions')) {
        let actions = v['actions'];
        for (let k in actions) {
          let action = actions[k];
          //console.log(k, action)
          for (let i = 0; i < action.length; i++) {
            let acV = action[i];
            if ('component' in acV) {
              let v = acV['component'].split(' ').filter(Boolean).join(' ');
              if (v === 'fc build --use-docker' || v === 'fc build') {
                v = 'fc3 build';
              }
              acV['component'] = v;
            }
          }
        }
      }
    }
  }
}
