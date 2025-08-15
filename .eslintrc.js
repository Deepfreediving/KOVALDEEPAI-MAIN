module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  plugins: ['react', 'react-hooks'],
  rules: {
    'no-unused-vars': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'react/no-unescaped-entities': 'warn',
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error'
  },
  env: {
    browser: true,
    node: true,
    es6: true,
    es2020: true
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  ignorePatterns: [
    '**/*.ts',
    '**/*.tsx'
  ]
};
