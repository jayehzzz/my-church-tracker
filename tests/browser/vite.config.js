import { defineConfig } from 'vite';
// Standalone fixture server: SvelteKit reserves HTML route handling.
export default defineConfig({ server: { host: '127.0.0.1', port: 5188, strictPort: true } });
