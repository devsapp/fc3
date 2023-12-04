exports.initializer = (context, callback) => {
  console.log('initializing');
  callback(null, '');
};

module.exports.handler = function (event, context, callback) {
  callback(null, 'hello world');
};
