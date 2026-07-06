import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

const packageAlias = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@hermiforge-decorix/angular-reactive': packageAlias('./packages/adapters/angular-reactive/src/index.ts'),
      '@hermiforge-decorix/angular-signal': packageAlias('./packages/adapters/angular-signal/src/index.ts'),
      '@hermiforge-decorix/cli': packageAlias('./packages/cli/src/index.ts'),
      '@hermiforge-decorix/core': packageAlias('./packages/core/src/index.ts'),
      '@hermiforge-decorix/json-schema': packageAlias('./packages/adapters/json-schema/src/index.ts'),
      '@hermiforge-decorix/nest': packageAlias('./packages/adapters/nest/src/index.ts'),
      '@hermiforge-decorix/react-hook-form': packageAlias('./packages/adapters/react-hook-form/src/index.ts'),
      '@hermiforge-decorix/react-tanstack-form': packageAlias('./packages/adapters/react-tanstack-form/src/index.ts'),
      '@hermiforge-decorix/vue-formkit': packageAlias('./packages/adapters/vue-formkit/src/index.ts'),
      '@hermiforge-decorix/vue-vee-validate': packageAlias('./packages/adapters/vue-vee-validate/src/index.ts'),
      '@hermiforge-decorix/zod': packageAlias('./packages/adapters/zod/src/index.ts')
    }
  },
  test: {
    globals: true,
    include: ['packages/*/test/**/*.test.ts', 'packages/adapters/*/test/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**', '**/dist/**'],
    // The cli-e2e suite drives tsx's real esbuild transform service against
    // on-disk fixtures; on GitHub Actions' constrained Linux runners this has
    // been observed to hang (not just run slowly) on later calls within the
    // same run, specifically when many test files execute concurrently and
    // compete for CPU. Serializing file execution removes that contention;
    // the whole suite is small enough (~2s locally) that this costs little.
    fileParallelism: false
  }
});
