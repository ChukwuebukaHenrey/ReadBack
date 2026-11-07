import { describe, expect, it } from 'vitest';
import { ApprovalGate } from './gate';
describe('one-shot approval gate', () => {
  it('rejects duplicate approval before asynchronous checks complete', () => { const gate = new ApprovalGate(); gate.begin(); expect(() => gate.begin()).toThrow(); gate.broadcast(); expect(() => gate.begin()).toThrow(); });
  it('cancels before signing or submission can proceed', () => { const gate = new ApprovalGate(); gate.begin(); gate.cancel(); expect(() => gate.assertChecking()).toThrow(); expect(() => gate.broadcast()).toThrow(); });
  it('cannot restore approval after cancellation or completion', () => { const gate = new ApprovalGate(); gate.cancel(); expect(() => gate.begin()).toThrow(); const done = new ApprovalGate(); done.begin(); done.broadcast(); done.finish(); expect(() => done.begin()).toThrow(); });
});
