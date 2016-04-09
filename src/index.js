import template from 'babel-template';
import { dirname, relative } from 'path';
import resolve from 'resolve';

const buildDefine = template(`
  define(MODULE_NAME, [SOURCES], FACTORY);
`);

const buildFactory = template(`
  (function (PARAMS) {
    BODY;
  })
`);

export default ({ types: t }) => {
  const moduleIds = new Map();

  function isValidRequireCall(path) {
    if (!path.isCallExpression()) return false;
    if (!path.get('callee').isIdentifier({ name: 'require' })) return false;
    if (path.scope.getBinding('require')) return false;

    const args = path.get('arguments');
    if (args.length !== 1) return false;

    const arg = args[0];
    if (!arg.isStringLiteral()) return false;

    return true;
  }

  const amdVisitor = {
    ReferencedIdentifier({ node, scope }) {
      if (node.name === 'exports' && !scope.getBinding('exports')) {
        this.hasExports = true;
      }

      if (node.name === 'module' && !scope.getBinding('module')) {
        this.hasModule = true;
      }
    },

    CallExpression(path) {
      if (!isValidRequireCall(path)) return;
      this.bareSources.push(path.node.arguments[0]);
      if (t.isAssignmentExpression(path.parent)) {
        this.hasRequire = true;
        return;
      }
      path.remove();
    },

    VariableDeclarator(path) {
      const id = path.get('id');
      if (!id.isIdentifier()) return;

      const init = path.get('init');
      if (!isValidRequireCall(init)) return;

      const source = init.node.arguments[0];
      this.sourceNames[source.value] = true;
      this.sources.push([id.node, source]);

      path.remove();
    },
  };

  return {
    inherits: require('babel-plugin-transform-es2015-modules-commonjs'),

    pre() {
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
        exit(nodePath, state) {
          const basedir = state.opts.basedir || process.cwd();
          const resolveModuleId = state.opts.resolveModuleId || (id => id);

          if (!t.isIdentifier(nodePath.node.callee, { name: 'require' }) &&
            !(t.isMemberExpression(nodePath.node.callee) &&
              t.isIdentifier(nodePath.node.callee.object, { name: 'require' }))
          ) return;

          const moduleArg = nodePath.node.arguments[0];
          if (moduleArg && moduleArg.type === 'StringLiteral') {
            const moduleId = moduleArg.value;
            if (moduleIds.has(moduleId)) return;

            const absPath = resolve.sync(moduleId, {
              basedir: this.file.opts.filename ? dirname(this.file.opts.filename) : basedir,
              extensions: ['.js', '.jsx'],
            });
            const relativePath = relative(basedir, absPath);
            const newModuleId = resolveModuleId(relativePath);

            moduleIds.set(newModuleId, true);
            nodePath.replaceWith(t.callExpression(
              nodePath.node.callee, [t.stringLiteral(newModuleId)]
            ));
          }
        },
      },
      ImportDeclaration: {
        exit(nodePath, state) {
          const basedir = state.opts.basedir || process.cwd();
          const resolveModuleId = state.opts.resolveModuleId || (id => id);

          const moduleArg = nodePath.node.source;
          if (moduleArg && moduleArg.type === 'StringLiteral') {
            const moduleId = moduleArg.value;
            if (moduleIds.has(moduleId)) return;

            const absPath = resolve.sync(moduleId, {
              basedir: this.file.opts.filename ? dirname(this.file.opts.filename) : basedir,
              extensions: ['.js', '.jsx'],
            });
            const relativePath = relative(basedir, absPath);
            const newModuleId = resolveModuleId(relativePath);

            moduleIds.set(newModuleId, true);
            nodePath.replaceWith(t.importDeclaration(
              nodePath.node.specifiers,
              t.stringLiteral(newModuleId)
            ));
          }
        },
      },
      Program: {
        exit(path, state) {
          if (this.ran) return;
          this.ran = true;

          for (const node of path.node.body) {
            if (t.isExpressionStatement(node) &&
              t.isCallExpression(node.expression) &&
              t.isIdentifier(node.expression.callee, { name: 'define' })) {
              return;
            }
          }

          path.traverse(amdVisitor, this);

          const basedir = state.opts.basedir || process.cwd();
          const resolveModuleId = state.opts.resolveModuleId || (id => id);
          const params = this.sources.map((source) => source[0]);
          let sources = this.sources.map((source) => source[1]);

          sources = sources.concat(this.bareSources.filter(str => !this.sourceNames[str.value]));

          let moduleName = this.getModuleName() ||
            resolveModuleId(relative(basedir, this.file.opts.filename));
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

          const { node } = path;
          const factory = buildFactory({
            PARAMS: params,
            BODY: node.body,
          });
          factory.expression.body.directives = node.directives;
          node.directives = [];

          node.body = [buildDefine({
            MODULE_NAME: moduleName,
            SOURCES: sources,
            FACTORY: factory,
          })];
        },
      },
    },
  };
};
