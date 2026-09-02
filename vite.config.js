import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    fs: {
      // Allow serving files from the convex folder (for generated API files)
      allow: ['..']
    }
  },
  resolve: {
    conditions: process.env.VITEST ? ['browser'] : []
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.js'],
    alias: {
      '@testing-library/svelte': '@testing-library/svelte/svelte5'
    },
    server: {
      deps: {
        inline: [/svelte/]
      }
    }
  }
});
