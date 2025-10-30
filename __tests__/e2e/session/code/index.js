'use strict';

exports.initializer = (context, callback) => {
  console.log('initializing session test function');
  callback(null, '');
};

exports.handler = (event, context, callback) => {
  console.log('hello session test');
  callback(null, 'hello session test');
};
