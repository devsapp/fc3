exports.handler = function (event, context, callback) {
  let a = 1;
  console.log(event.toString());
  console.log(JSON.stringify(context));
  console.log('My logs');
  console.log('My logs2 ');
  console.log(process.env.FC_FUNCTION_MEMORY_SIZE);
  callback(null, JSON.parse(event.toString()));
  // callback(null, 'hello world');
};

/*
exports.handler = async function (event, context, callback) {
  callback(null, 'hello world');
};
*/
