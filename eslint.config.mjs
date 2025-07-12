import { ESLint } from 'eslint';
import reactPlugin from 'eslint-plugin-react'; // Import the plugin
import babelParser from '@babel/eslint-parser';

export default [
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'], // Define files only once
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        requireConfigFile: false,
        babelOptions: {
          presets: ['@babel/preset-react'],
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    plugins: {
      react: reactPlugin, // Use the plugin as an object
    },
    rules: {
      // Custom rules here
    },
  },
];
