import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';
// Local-only component integration harness. Uses authenticated convex-test
// transactions and no deployment URL, credentials, or external database.
export default defineConfig({
  plugins: [svelte(), {
    name: 'task04-in-memory-backend',
    configureServer(server) {
      server.middlewares.use('/__task04', async (req,res) => {
        try {
          if (req.method !== 'POST' || (req.headers.origin && req.headers.origin !== 'http://127.0.0.1:5194')) throw new Error('Fixture requests must be same-origin POSTs');
          let body = ''; for await (const chunk of req) body += chunk;
          const backend = await server.ssrLoadModule('/tests/browser/task04/backend.ts');
          const data = await backend.request(JSON.parse(body));
          res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({data}));
        } catch (error) { res.statusCode=400; res.end(JSON.stringify({error:error.message})); }
      });
    },
  }],
  resolve: { alias: [{find:'$lib/convex.js', replacement:resolve('tests/browser/task04/client.js')}, {find:'$app/environment', replacement:resolve('tests/browser/task04/environment.js')}, {find:'$lib', replacement:resolve('src/lib')}] },
  server: {host:'127.0.0.1', port:5194, strictPort:true},
});
