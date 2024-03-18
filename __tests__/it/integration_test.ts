import Fc from '../../src/index';
import { IInputs } from '../../src/interface';
import _Logger from '@serverless-devs/logger';
import path from 'path';
import _ from 'lodash';
import { removeNullValues } from '../../src/utils';

const loggerInstance = new _Logger({
  traceId: 'traceId_12345789',
  logDir: '/tmp/.s',
  //level: 'DEBUG',
});
const logger = loggerInstance.__generate('s_cli_integration_test');

const inputs: IInputs = {
  // 当前执行路径
  cwd: __dirname,
  baseDir: __dirname,
  // 项目名称
  name: 'hello-world-app',
  props: {
    region: process.env.REGION==='cn-hongkong'?'cn-hongkong':'cn-huhehaote',
    functionName: 'start-py',
    description: 'hello world by serverless devs',
    runtime: 'python3.9',
    code: './code',
    handler: 'index.handler',
    memorySize: 128,
    timeout: 60,
  },
  // 执行的方法
  command: 'deploy',
  args: ['-t', 's.yaml'],
  // yaml相关信息
  yaml: {
    path: path.join(__dirname, 's.yaml'),
  },
  // 当前业务模块相关信息
  resource: {
    name: 'hello_world',
    component: 'fc3',
    access: 'default',
  },
  // 已经执行完的业务模块的输出结果
  outputs: {},
  // 获取当前的密钥信息
  getCredential: async () => ({
    AccountID: process.env.DEVS_TEST_UID,
    AccessKeyID: process.env.DEVS_TEST_AK_ID,
    AccessKeySecret: process.env.DEVS_TEST_AK_SECRET,
  }),
};

test('deploy event function', async () => {
  const myFcInstance = new Fc({ logger: logger });
  const output = await myFcInstance.deploy(inputs);
  expect(output).toEqual({
    region: process.env.REGION || 'cn-huhehaote',
    description: 'hello world by serverless devs',
    functionName: 'start-py',
    handler: 'index.handler',
    internetAccess: true,
    memorySize: 128,
    role: '',
    runtime: 'python3.9',
    timeout: 60,
  });
});

const inputs_http = _.cloneDeep(inputs);
inputs_http.props.triggers = [
  {
    triggerName: 'httpTrigger',
    triggerType: 'http',
    description: 'xxxx',
    qualifier: 'LATEST',
    triggerConfig: {
      authType: 'anonymous',
      disableURLInternet: false,
      methods: ['GET', 'POST'],
    },
  },
];
test('deploy http function', async () => {
  const myFcInstance = new Fc({ logger: logger });
  const output = await myFcInstance.deploy(inputs_http);
  removeNullValues(output);
  delete output['url']
  expect(output).toEqual({
    region: process.env.REGION || 'cn-huhehaote',
    description: 'hello world by serverless devs',
    functionName: 'start-py',
    handler: 'index.handler',
    internetAccess: true,
    memorySize: 128,
    role: '',
    runtime: 'python3.9',
    timeout: 60,
    triggers: [
      {
        description: 'xxxx',
        qualifier: 'LATEST',
        triggerConfig: {
          methods: ['GET', 'POST'],
          authType: 'anonymous',
          disableURLInternet: false,
        },
        triggerName: 'httpTrigger',
        triggerType: 'http',
      },
    ]
  });
});
