
const puppeteer = require('puppeteer')
const koa = require('koa');

exports.handler = function (event, context, callback) {
  let a = 1;
  console.log(event.toString());
  console.log("My log")
  console.log("My log 2")
  console.log(process.env.FC_FUNCTION_MEMORY_SIZE)
  callback(null, JSON.parse(event.toString()));
  // callback(null, 'hello world');
};

/*
exports.handler = async function (event, context, callback) {
  callback(null, 'hello world');
};
*/