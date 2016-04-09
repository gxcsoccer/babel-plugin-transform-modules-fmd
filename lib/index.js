'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _babelTemplate = require('babel-template');

var _babelTemplate2 = _interopRequireDefault(_babelTemplate);

var _path = require('path');

var _resolve = require('resolve');

var _resolve2 = _interopRequireDefault(_resolve);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var buildDefine = (0, _babelTemplate2.default)('\n  define(MODULE_NAME, [SOURCES], FACTORY);\n');

var buildFactory = (0, _babelTemplate2.default)('\n  (function (PARAMS) {\n    BODY;\n  })\n');

exports.default = function (_ref) {
  var t = _ref.types;

  var moduleIds = new Map();

  function isValidRequireCall(path) {
    if (!path.isCallExpression()) return false;
    if (!path.get('callee').isIdentifier({ name: 'require' })) return false;
    if (path.scope.getBinding('require')) return false;

    var args = path.get('arguments');
    if (args.length !== 1) return false;

    var arg = args[0];
    if (!arg.isStringLiteral()) return false;

    return true;
  }

  var amdVisitor = {
    ReferencedIdentifier: function ReferencedIdentifier(_ref2) {
      var node = _ref2.node;
      var scope = _ref2.scope;

      if (node.name === 'exports' && !scope.getBinding('exports')) {
        this.hasExports = true;
      }

      if (node.name === 'module' && !scope.getBinding('module')) {
        this.hasModule = true;
      }
    },
    CallExpression: function CallExpression(path) {
      if (!isValidRequireCall(path)) return;
      this.bareSources.push(path.node.arguments[0]);
      if (t.isAssignmentExpression(path.parent)) {
        this.hasRequire = true;
        return;
      }
      path.remove();
    },
    VariableDeclarator: function VariableDeclarator(path) {
      var id = path.get('id');
      if (!id.isIdentifier()) return;

      var init = path.get('init');
      if (!isValidRequireCall(init)) return;

      var source = init.node.arguments[0];
      this.sourceNames[source.value] = true;
      this.sources.push([id.node, source]);

      path.remove();
    }
  };

  return {
    inherits: require('babel-plugin-transform-es2015-modules-commonjs'),

    pre: function pre() {
      // source strings
      this.sources = [];
      this.sourceNames = Object.create(null);

      // bare sources
      this.bareSources = [];

      this.hasExports = false;
      this.hasModule = false;
      this.hasRequire = false;
    },


    visitor: {
      CallExpression: {
        exit: function exit(nodePath, state) {
          var basedir = state.opts.basedir || process.cwd();
          var resolveModuleId = state.opts.resolveModuleId || function (id) {
            return id;
          };

          if (!t.isIdentifier(nodePath.node.callee, { name: 'require' }) && !(t.isMemberExpression(nodePath.node.callee) && t.isIdentifier(nodePath.node.callee.object, { name: 'require' }))) return;

          var moduleArg = nodePath.node.arguments[0];
          if (moduleArg && moduleArg.type === 'StringLiteral') {
            var moduleId = moduleArg.value;
            if (moduleIds.has(moduleId)) return;

            var absPath = _resolve2.default.sync(moduleId, {
              basedir: this.file.opts.filename ? (0, _path.dirname)(this.file.opts.filename) : basedir,
              extensions: ['.js', '.jsx']
            });
            var relativePath = (0, _path.relative)(basedir, absPath);
            var newModuleId = resolveModuleId(relativePath);

            moduleIds.set(newModuleId, true);
            nodePath.replaceWith(t.callExpression(nodePath.node.callee, [t.stringLiteral(newModuleId)]));
          }
        }
      },
      ImportDeclaration: {
        exit: function exit(nodePath, state) {
          var basedir = state.opts.basedir || process.cwd();
          var resolveModuleId = state.opts.resolveModuleId || function (id) {
            return id;
          };

          var moduleArg = nodePath.node.source;
          if (moduleArg && moduleArg.type === 'StringLiteral') {
            var moduleId = moduleArg.value;
            if (moduleIds.has(moduleId)) return;

            var absPath = _resolve2.default.sync(moduleId, {
              basedir: this.file.opts.filename ? (0, _path.dirname)(this.file.opts.filename) : basedir,
              extensions: ['.js', '.jsx']
            });
            var relativePath = (0, _path.relative)(basedir, absPath);
            var newModuleId = resolveModuleId(relativePath);

            moduleIds.set(newModuleId, true);
            nodePath.replaceWith(t.importDeclaration(nodePath.node.specifiers, t.stringLiteral(newModuleId)));
          }
        }
      },
      Program: {
        exit: function exit(path, state) {
          var _this = this;

          if (this.ran) return;
          this.ran = true;

          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = path.node.body[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var _node = _step.value;

              if (t.isExpressionStatement(_node) && t.isCallExpression(_node.expression) && t.isIdentifier(_node.expression.callee, { name: 'define' })) {
                return;
              }
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return) {
                _iterator.return();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }

          path.traverse(amdVisitor, this);

          var basedir = state.opts.basedir || process.cwd();
          var resolveModuleId = state.opts.resolveModuleId || function (id) {
            return id;
          };
          var params = this.sources.map(function (source) {
            return source[0];
          });
          var sources = this.sources.map(function (source) {
            return source[1];
          });

          sources = sources.concat(this.bareSources.filter(function (str) {
            return !_this.sourceNames[str.value];
          }));

          var moduleName = this.getModuleName() || resolveModuleId((0, _path.relative)(basedir, this.file.opts.filename));
          if (moduleName) moduleName = t.stringLiteral(moduleName);

          if (this.hasExports) {
            sources.unshift(t.stringLiteral('exports'));
            params.unshift(t.identifier('exports'));
          }

          if (this.hasModule) {
            sources.unshift(t.stringLiteral('module'));
            params.unshift(t.identifier('module'));
          }

          if (this.hasRequire) {
            sources.unshift(t.stringLiteral('require'));
            params.unshift(t.identifier('require'));
          }

          var node = path.node;

          var factory = buildFactory({
            PARAMS: params,
            BODY: node.body
          });
          factory.expression.body.directives = node.directives;
          node.directives = [];

          node.body = [buildDefine({
            MODULE_NAME: moduleName,
            SOURCES: sources,
            FACTORY: factory
          })];
        }
      }
    }
  };
};

module.exports = exports['default'];