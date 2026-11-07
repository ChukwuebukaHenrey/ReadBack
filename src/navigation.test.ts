import { describe, expect, it } from 'vitest';
import { initialState, parseRequest, reducer } from './navigation';
describe('deterministic navigation', () => {
    it('recognizes commands offline with punctuation and whitespace', () => {
        expect(parseRequest('  What can I do?  ')).toEqual({ type: 'command', command: 'what_can_i_do' });
        expect(parseRequest('CHECK BALANCE')).toEqual({ type: 'navigate', view: 'wallet' });
    });
    it('never interprets financial instructions as authorization', () => {
        for (const request of ['confirm', 'send 0.2 SOL to Mum', '__proto__', 'constructor'])
            expect(parseRequest(request)).toEqual({ type: 'unknown' });
    });
    it('repeats only the announcement without navigating or executing', () => {
        const wallet = reducer(initialState, { type: 'navigate', view: 'wallet' });
        const repeated = reducer(wallet, { type: 'command', command: 'repeat' });
        expect(repeated).toEqual({ ...wallet, revision: wallet.revision + 1 });
    });
    it('returns through history without retaining transaction approval', () => {
        const wallet = reducer(initialState, { type: 'navigate', view: 'wallet' });
        const transfer = reducer(wallet, { type: 'navigate', view: 'transfer' });
        const back = reducer(transfer, { type: 'command', command: 'go_back' });
        expect(back.view).toBe('wallet');
        expect(back.history).toEqual(['home']);
        expect(back.announcement).toContain('No pending action');
    });
    it('handles back on home and repeated navigation safely', () => {
        expect(reducer(initialState, { type: 'command', command: 'go_back' }).view).toBe('home');
        expect(reducer(initialState, { type: 'navigate', view: 'home' }).history).toEqual([]);
    });
    it('discloses current limitations when discovering capabilities', () => {
        expect(reducer(initialState, { type: 'command', command: 'what_can_i_do' }).announcement).toContain('saved contacts');
        expect(reducer(initialState, { type: 'command', command: 'what_can_i_do' }).announcement).toContain('separate review');
    });
});
