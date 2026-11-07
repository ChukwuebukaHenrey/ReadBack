import { defineConfig, loadEnv } from 'vite';
import { handleIntent } from './server/intent.ts';
import { handleDevnet } from './server/devnet.ts';
import { handleExplanation } from './server/explain.ts';

// Vite's built-in JSX transform reads jsx: react-jsx from tsconfig.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: { watch: { ignored: ['**/.live-devnet-profile/**', '**/test-results/**'] } },
    plugins: [{
      name: 'readback-local-api',
      configureServer(server) {
        const routes: [string, (request: Request) => Promise<Response>][] = [
          ['/api/intent', request => handleIntent(request, env)],
          ['/api/parse-intent', request => handleIntent(request, env)],
          ['/api/explain', request => handleExplanation(request, env)],
          ['/api/devnet', request => handleDevnet(request)],
        ];
        for (const [path, handle] of routes) server.middlewares.use(path, async (req, res) => {
          let body = '';
          try {
            for await (const chunk of req) {
              body += chunk.toString();
              if (body.length > 8192) {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Request is too long.' }));
                return;
              }
            }
            const response = await handle(new Request(`http://${req.headers.host}${path}`, {
              method: req.method,
              headers: { 'Content-Type': req.headers['content-type'] ?? '', ...(req.headers.origin ? { origin: req.headers.origin } : {}) },
              ...(req.method === 'POST' ? { body } : {}),
            }));
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
