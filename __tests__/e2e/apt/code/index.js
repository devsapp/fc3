const { execSync } = require('child_process');
require('chalk');

module.exports.handler = function (event, context, callback) {
  // throw new Error('xxx')
  console.log(process.env.PATH);
  console.log(process.env.LD_LIBRARY_PATH);
  console.log(event.toString());
  execSync('jq --help', {
    shell: true,
    stdio: 'inherit'
  });
  
  execSync('rsync --version', {
    shell: true,
    stdio: 'inherit'
  });
  callback(null, 'hello world');
};
