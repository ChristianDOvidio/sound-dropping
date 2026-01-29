import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'game.js',
  output: {
    file: 'bundle.js',
    format: 'iife'
  },
  plugins: [nodeResolve()]
};