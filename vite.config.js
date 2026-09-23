import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [sveltekit()],
  // Vercel's deployment target comes from the build process, not a VITE_ env
  // value that could be copied from a different deployment configuration.
  define: process.env.VITEST ? undefined : {
    'import.meta.env.HOSTING_ENV': JSON.stringify(process.env.VERCEL_ENV || '')
  },
  server: {
    fs: {
      // Generated Convex modules are inside this project; do not expose siblings.
      allow: ['.']
    }
  },
  // Keep Vite's browser conditions in development. An empty override resolves
  // Svelte's server entry and silently disables client onMount callbacks.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
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
