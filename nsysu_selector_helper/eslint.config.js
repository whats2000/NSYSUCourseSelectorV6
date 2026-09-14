import js from '@eslint/js';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';
import tsEslint from '@typescript-eslint/eslint-plugin';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettierRecommended from 'eslint-plugin-prettier/recommended';

export default defineConfig([
  // 建置產物與測試覆蓋率報告不需檢查
  globalIgnores(['dist', 'coverage', '.swc']),
  {
    // 僅檢查 TypeScript 原始碼，取代舊 script 的 --ext ts,tsx
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tsEslint.configs['flat/recommended'],
      react.configs.flat.recommended,
      // eslint-plugin-react-hooks@5 沒有 configs.flat，
      // 'recommended-latest' 才是這個版本唯一的 flat config，
      // 'recommended' 與 'recommended-legacy' 都還是 eslintrc 格式。
      // 三者啟用的規則完全相同，等同舊的 plugin:react-hooks/recommended。
      reactHooks.configs['recommended-latest'],
      prettierRecommended,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      // 對應舊設定的 env: { browser: true, es2020: true }
      globals: { ...globals.browser, ...globals.es2020 },
    },
    plugins: {
      'react-refresh': reactRefresh,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'prettier/prettier': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // 換行符號交由 prettier 的 endOfLine 設定處理
      'linebreak-style': 'off',
      // React 17+ 的新 JSX transform 不需要 import React
      'react/react-in-jsx-scope': 'off',
      'react/self-closing-comp': ['error', { component: true, html: true }],
    },
  },
]);
