import reactPlugin from 'eslint-plugin-react';
import babelParser from '@babel/eslint-parser';

export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        ecmaVersion: 2021,  // Use ECMAScript 2021
        sourceType: 'module',  // Use module syntax
        ecmaFeatures: {
          jsx: true,  // Enable JSX parsing
        },
      },
    },
    settings: {
      react: {
        version: 'detect',  // Automatically detect React version
      },
    },
    plugins: {
      react: reactPlugin,  // Add the React plugin
    },
    rules: {
      'react/react-in-jsx-scope': 'off',  // No need for React import with React 17+
      'next/no-page-custom-font': 'off',
      'next/no-img-element': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'react/prop-types': 'off',
      'react/jsx-uses-react': 'off',
    },
  },
];
