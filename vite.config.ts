import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: '/axis-allies-calculator/',
  plugins: [svelte()],
  test: {
    environment: 'node',
    include: ['src/engine/**/*.test.ts'],
  },
});
