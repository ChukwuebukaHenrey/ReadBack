import { handleIntent } from '../server/intent.ts';

// Vercel's Node.js Web handler. Secrets are read only in the server runtime.
export default {
  fetch(request: Request) {
    return handleIntent(request, process.env);
  },
};
