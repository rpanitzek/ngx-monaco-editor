import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import unusedImports from 'eslint-plugin-unused-imports';
import { fileURLToPath } from 'node:url';
import { defineConfig, globalIgnores, includeIgnoreFile } from 'eslint/config';

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url));

export default defineConfig([
  includeIgnoreFile(gitignorePath),
  globalIgnores(['dist/**', 'coverage/**', '.angular/**']),

  eslintPluginPrettierRecommended,

  {
    files: ['**/*.ts'],

    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],

    processor: angular.processInlineTemplates,

    plugins: {
      'unused-imports': unusedImports,
    },

    rules: {
      // Angular
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],

      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],

      '@angular-eslint/no-output-on-prefix': 'off',
      '@angular-eslint/prefer-standalone': 'off',

      // TypeScript
      '@typescript-eslint/no-explicit-any': 'off',

      // Unused imports
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',

      'unused-imports/no-unused-imports': 'error',

      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // Prettier
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'auto',
        },
      ],
    },
  },

  {
    files: ['**/*.html'],

    extends: [...angular.configs.templateRecommended],

    ignores: ['**/*inline-template-*.component.html'],

    rules: {
      'prettier/prettier': [
        'error',
        {
          parser: 'angular',
          endOfLine: 'auto',
        },
      ],
    },
  },
]);
