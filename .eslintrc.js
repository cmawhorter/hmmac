module.exports = {
  root: true,
  plugins: ['eslint-comments', 'import'],
  extends: [
    'airbnb/base',
    'plugin:jest/recommended',
    'plugin:eslint-comments/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
  ],
  rules: {
    'lines-between-class-members': [
      'error',
      'always',
      { exceptAfterSingleLine: true },
    ],
    'padding-line-between-statements': [
      'error',
      {
        blankLine: 'always',
        prev: '*',
        next: ['block-like', 'export', 'return'],
      },
      { blankLine: 'any', prev: 'export', next: 'export' },
    ],
    'no-underscore-dangle': 0,
    'operator-linebreak': [
      'error',
      'after',
      { overrides: { '?': 'before', ':': 'before' } },
    ],
    'no-restricted-globals': 0,
    'class-methods-use-this': 0,
    'max-len': [
      'error',
      {
        code: 100,
        ignoreComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
      },
    ],
    'function-paren-newline': 0,
    'implicit-arrow-linebreak': 0,
    'object-curly-newline': [
      'error',
      {
        minProperties: 5,
        consistent: true,
      },
    ],
    'import/prefer-default-export': 0,
  },
};
