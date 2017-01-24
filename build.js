'use strict';

const rollup      = require('rollup');

const babel       = require('rollup-plugin-babel');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs    = require('rollup-plugin-commonjs');
const builtins    = require('builtin-modules');

rollup.rollup({
  entry:              'src/main.js',
  plugins: [
    nodeResolve({
      jsnext:         true,
      main:           true,
    }),
    commonjs({
      include:        'node_modules/**',
    }),
    babel({
      exclude:        'node_modules/**',
      babelrc:        false,
      presets:        [ [ 'es2015', { modules: false } ] ],
      plugins:        [ 'external-helpers' ],
    }),
  ],
  external:           builtins,
}).then(bundle => {
  bundle.write({
    format:       'cjs',
    sourceMap:    true,
    dest:         'dist/hmmac.cjs.js',
  });
  bundle.write({
    format:       'es',
    sourceMap:    true,
    dest:         'dist/hmmac.es.js',
  });
}, console.error);
