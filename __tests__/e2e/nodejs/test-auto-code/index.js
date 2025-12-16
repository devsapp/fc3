const fs = require('fs');
const FC20230330 = require('@alicloud/fc20230330');

exports.initializer = (context, callback) => {
  console.log('initializing');
  callback(null, '');
};

module.exports.handler = async function (event, context, callback) {
  console.log(event.toString());
  console.log(JSON.stringify(context));
  const functionName = context.function.name;
  console.log(`functionName: ${functionName}`);
  const { ossConfig } = await getOssConfig(context, functionName);
  const nasDir = `/mnt/${functionName}`;
  const ossDir = ossConfig && ossConfig?.mountPoints[0]?.mountDir;
  const nasFile = `${nasDir}/test.txt`;
  const ossFile = `${ossDir}/test.txt`;
  if (fs.existsSync(nasDir)) {
    if (fs.existsSync(nasFile)) {
      const content = fs.readFileSync(nasFile, 'utf8');
      console.log(`nasFile content: ${content}`);
    } else {
      fs.writeFileSync(nasFile, 'hello world');
      console.log(`nasFile created: ${nasFile}`);
    }
  }
  if (ossDir && fs.existsSync(ossDir)) {
    if (fs.existsSync(ossFile)) {
      const content = fs.readFileSync(ossFile, 'utf8');
      console.log(`ossFile content: ${content}`);
    } else {
      fs.writeFileSync(ossFile, 'hello world');
      console.log(`ossFile created: ${ossFile}`);
    }
  }
  callback(null, 'hello world');
};

async function getOssConfig(context, functionName) {
  const {
    region,
    credentials: { accessKeyId, accessKeySecret, securityToken },
    accountId,
  } = context;
  const config = {
    accessKeyId,
    accessKeySecret,
    securityToken,
    endpoint: `${accountId}.${region}.fc.aliyuncs.com`,
  };
  const fcClient = new FC20230330.default(config);
  let getFunctionRequest = new FC20230330.GetFunctionRequest({});

  try {
    const result = await fcClient.getFunction(functionName, getFunctionRequest);
    console.log(JSON.stringify(result, null, 2));

    return {
      ossConfig: result?.body?.ossMountConfig,
    };
  } catch (e) {
    return {
      ossConfig: null,
    };
  }
}
