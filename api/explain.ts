import { handleExplanation } from '../server/explain.js';
export default { fetch(request: Request) { return handleExplanation(request, process.env); } };
