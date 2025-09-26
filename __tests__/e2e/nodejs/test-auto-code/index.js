const fs = require('fs');

exports.initializer = (context, callback) => {
  console.log('initializing');
  callback(null, '');
};

module.exports.handler = function (event, context, callback) {
  console.log(event.toString());
  console.log(JSON.stringify(context));
  const functionName = context.function.name;
  console.log(`functionName: ${functionName}`);
  const nasDir = `/mnt/${functionName}`;
  const ossDir = `/mnt/${functionName}`;
  const nasFile = `${nasDir}/test.txt`;
  const ossFile = `${ossDir}/test.txt`;
  if (fs.existsSync(nasFile)) {
    const content = fs.readFileSync(nasFile, 'utf8');
    console.log(`nasFile content: ${content}`);
  } else {
    fs.writeFileSync(nasFile, 'hello world');
    console.log(`nasFile created: ${nasFile}`);
  }
  if (fs.existsSync(ossFile)) {
    const content = fs.readFileSync(ossFile, 'utf8');
    console.log(`ossFile content: ${content}`);
  } else {
    fs.writeFileSync(ossFile, 'hello world');
    console.log(`ossFile created: ${ossFile}`);
  }
  callback(null, 'hello world');
};
