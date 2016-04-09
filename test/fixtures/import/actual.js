import template from 'babel-template';
import { join } from 'path';

exports.foo = function() {
  console.log(join(__dirname, '123'));
};
