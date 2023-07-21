module.exports.handler = function (event, context, callback) {
  // throw new Error('xxx')
  console.log(event.toString());
  // console.dir(context);
  console.log('hello world');
  callback(null, 'hello world');
};
