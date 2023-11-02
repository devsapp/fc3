'use strict';

module.exports.handler = function (event, context, callback) {
  console.log(event.toString());
  callback(null, event);
};
