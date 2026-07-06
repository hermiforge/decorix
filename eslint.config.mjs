import {defineConfig, globalIgnores} from 'eslint/config';
import tseslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';

// Flat ESLint config: typescript-eslint (non-type-checked) + SonarJS quality rules.
// Type-aware linting is intentionally omitted to avoid per-package `project` wiring;
// SonarJS and the syntactic typescript-eslint rules already cover the intended gate.
export default defineConfig([
    globalIgnores(['**/dist/**', '**/node_modules/**', '**/*.d.ts']),
    {
        files: [
            'packages/*/src/**/*.ts',
            'packages/*/test/**/*.ts',
            'packages/adapters/*/src/**/*.ts',
            'packages/adapters/*/test/**/*.ts',
            'examples/**/*.ts'
        ],
        extends: [tseslint.configs.recommended, sonarjs.configs.recommended],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module'
        }
    },
    {
        // Tests and examples favor readability over deduplication, and use literal
        // "password" fixtures for password-match validation scenarios.
        files: ['packages/*/test/**/*.ts', 'packages/adapters/*/test/**/*.ts', 'examples/**/*.ts'],
        rules: {
            'sonarjs/no-duplicate-string': 'off',
            'sonarjs/cognitive-complexity': 'off',
            'sonarjs/no-hardcoded-passwords': 'off'
        }
    }
]);
