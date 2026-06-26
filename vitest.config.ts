import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

const packageAlias = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@decorix/angular-reactive': packageAlias('./packages/angular-reactive/src/index.ts'),
      '@decorix/angular-signal': packageAlias('./packages/angular-signal/src/index.ts'),
      '@decorix/core': packageAlias('./packages/core/src/index.ts'),
      '@decorix/json-schema': packageAlias('./packages/json-schema/src/index.ts'),
      '@decorix/nest': packageAlias('./packages/nest/src/index.ts'),
      '@decorix/react-hook-form': packageAlias('./packages/react-hook-form/src/index.ts'),
      '@decorix/react-tanstack-form': packageAlias('./packages/react-tanstack-form/src/index.ts'),
      '@decorix/vue-formkit': packageAlias('./packages/vue-formkit/src/index.ts'),
      '@decorix/vue-vee-validate': packageAlias('./packages/vue-vee-validate/src/index.ts'),
      '@decorix/zod': packageAlias('./packages/zod/src/index.ts')
    }
  },
  test: {
    globals: true,
    include: ['packages/*/test/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', '**/dist/**']
  }
});
