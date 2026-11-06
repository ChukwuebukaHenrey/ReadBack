import { handleDevnet } from '../server/devnet.ts';
export default { fetch(request: Request) { return handleDevnet(request); } };
