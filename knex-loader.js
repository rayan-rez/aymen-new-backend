// knex-loader.js
// This file registers all necessary loaders before Knex runs

const path = require('path');

// Register tsconfig-paths for @ aliases
require('tsconfig-paths').register({
  baseUrl: __dirname,
  paths: {
    '@/*': ['src/*'],
    '@services/*': ['src/services/*'],
    '@middlewares/*': ['src/middlewares/*'],
    '@utils/*': ['src/utils/*'],
    '@models/*': ['src/models/*'],
    '@models': ['src/models/index.ts'],
    '@controllers/*': ['src/controllers/*'],
    '@constants/*': ['src/constants/*'],
    '@/types/*': ['src/types/*'],
    '@tests/*': ['__tests__/*']
  }
});

// Register ts-node for TypeScript execution
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
  }
});

module.exports = require('./knexfile.js');