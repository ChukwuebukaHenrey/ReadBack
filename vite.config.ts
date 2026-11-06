import { defineConfig, loadEnv } from 'vite';
import { handleIntent } from './server/intent.ts';

// Vite's built-in JSX transform reads jsx: react-jsx from tsconfig.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [{
      name: 'readback-local-api',
      configureServer(server) {
        server.middlewares.use('/api/intent', async (req, res) => {
          let body = '';
          try {
            for await (const chunk of req) {
              body += chunk.toString();
              if (body.length > 4096) {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Request is too long.' }));
                return;
              }
            }
            const response = await handleIntent(new Request('http://localhost/api/intent', {
              method: req.method,
              headers: { 'Content-Type': req.headers['content-type'] ?? '' },
              ...(req.method === 'POST' ? { body } : {}),
            }), env);
            res.writeHead(response.status, Object.fromEntries(response.headers));
            res.end(await response.text());
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Could not read request.' }));
          }
        });
      },
    }],
  };
});
