define('app/test/fixtures/import/actual.js', ['exports', 'app/node_modules/babel-template/lib/index.js', 'app/path'], function (exports, _index, _path) {
  'use strict';

  var _index2 = _interopRequireDefault(_index);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  exports.foo = function () {
    console.log((0, _path.join)(__dirname, '123'));
  };
});