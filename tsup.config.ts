import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  splitting: false,
  external: [
    '@decorix/core',
    'zod',
    '@angular/core',
    '@angular/forms',
    'react',
    'react-hook-form',
    '@tanstack/react-form',
    'vue',
    'vee-validate',
    '@formkit/vue',
    '@nestjs/common'
  ]
});
