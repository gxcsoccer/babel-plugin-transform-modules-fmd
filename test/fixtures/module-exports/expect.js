define('app/test/fixtures/module-exports/actual.js', ['require', 'module', 'app/node_modules/react/react.js'], function (require, module) {
  'use strict';

  module.exports = require('app/node_modules/react/react.js');
});