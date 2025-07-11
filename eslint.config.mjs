import { ESLint } from 'eslint';
import reactPlugin from 'eslint-plugin-react'; // Import the plugin

export default [
  {
    files: ['*.js', '*.jsx', '*.ts', '*.tsx'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
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
