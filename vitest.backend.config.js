import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['convex/**/*.test.ts'],
    environment: 'edge-runtime',
    coverage: { include: ['convex/lib/security.ts', 'convex/access.ts', 'convex/lib/maintenance.ts'] },
  },
});
