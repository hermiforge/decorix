import { defineConfig } from 'tsdown';

export default defineConfig({
  // tsdown otherwise resolves `entry` relative to this shared config file's
  // own directory (the repo root), not the invoking package's directory.
  cwd: process.cwd(),
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2022',
  // Keep tsup's `index.js` (esm) / `index.cjs` (cjs) naming instead of tsdown's
  // default fixed .mjs/.cjs extensions, matching every package's `exports` map.
  fixedExtension: false,
  deps: {
    neverBundle: [
      '@hermiforge-decorix/core',
      'zod',
      '@angular/core',
      '@angular/forms',
      'react',
      'react-hook-form',
      '@tanstack/react-form',
      'vue',
      'vee-validate',
      '@formkit/vue',
      '@nestjs/common',
      'svelte',
      'felte',
      '@felte/solid',
      'solid-js',
      '@modular-forms/solid',
      'sveltekit-superforms',
      '@sveltejs/kit'
    ]
  }
});
