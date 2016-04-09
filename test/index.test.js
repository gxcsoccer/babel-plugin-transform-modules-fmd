import 'should';
import { join } from 'path';
import { readdirSync, readFileSync } from 'fs';
import { transformFileSync } from 'babel-core';
import plugin from '../src';

const pkg = require('../package');

describe('index.test.js', () => {

  readdirSync(join(__dirname, 'fixtures'))
    .forEach(spec => {
      it(`should transform "${spec}" ok`, () => {
        const actual = transformFileSync(join(__dirname, 'fixtures', spec, '/actual.js'), {
          presets: ['es2015', 'react', 'stage-0'],
          plugins: ['add-module-exports', [plugin, {
            basedir: join(__dirname, '..'),
            resolveModuleId(relativePath) {
              return join('app', relativePath);
            }
          }]],
        }).code;

        actual.should.equal(readFileSync(join(__dirname, 'fixtures', spec, '/expect.js'), 'utf8'))
      });
    });
});
