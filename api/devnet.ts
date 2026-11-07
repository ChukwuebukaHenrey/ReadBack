import { handleDevnet } from '../server/devnet.js';
export default { fetch(request: Request) { return handleDevnet(request); } };
