import type { Page } from '@playwright/test';
import { getTransactionDecoder, getCompiledTransactionMessageDecoder, getSignatureFromTransaction } from '@solana/kit';

// RPC fixtures exist only in this browser test. The app always uses real RPC at runtime.
export async function mockDevnet(page: Page, options: { failSimulation?: boolean; wrongNetwork?: boolean; uncertain?: boolean; changedFee?: boolean; slowConfirm?: number; expired?: boolean; preflightReject?: boolean } = {}) {
  let sends = 0; let simulations = 0; let fees = 0; let statusChecks = 0;
  await page.route('**/api/devnet', async route => {
    const { id, method, params } = route.request().postDataJSON();
    let result: unknown;
    const account = (lamports: number) => ({ lamports, owner: '11111111111111111111111111111111', data: ['', 'base64'], executable: false, rentEpoch: 0, space: 0 });
    switch (method) {
      case 'getGenesisHash': result = options.wrongNetwork ? 'wrong-network' : 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG'; break;
      case 'getBalance': result = { context: { slot: 100 }, value: 2_500_000_000 }; break;
      case 'getLatestBlockhash': result = { context: { slot: 100 }, value: { blockhash: '11111111111111111111111111111111', lastValidBlockHeight: 1000 + simulations } }; break;
      case 'getFeeForMessage': fees++; result = { context: { slot: 100 }, value: options.changedFee && fees > 1 ? 6000 : 5000 }; break;
      case 'simulateTransaction': {
        simulations++;
        const decoded = getCompiledTransactionMessageDecoder().decode(getTransactionDecoder().decode(Buffer.from(params[0], 'base64')).messageBytes);
        const data = new Uint8Array(decoded.instructions[0].data!);
        const amount = Number(new DataView(data.buffer).getBigUint64(4, true));
        result = { context: { slot: 100 }, value: { err: options.failSimulation ? { InstructionError: [0, { Custom: 1 }] } : null, accounts: [account(2_500_000_000 - amount - (options.changedFee && fees > 1 ? 6000 : 5000)), account(amount)], logs: [] } };
        break;
      }
      case 'sendTransaction': {
        sends++;
        if (options.uncertain) { await route.abort('failed'); return; }
        if (options.preflightReject) { await route.fulfill({ json: { jsonrpc: '2.0', id, error: { code: -32002, message: 'Transaction simulation failed: Blockhash not found', data: { err: 'BlockhashNotFound', logs: [], accounts: null, unitsConsumed: 0 } } } }); return; }
        result = getSignatureFromTransaction(getTransactionDecoder().decode(Buffer.from(params[0], 'base64'))); break;
      }
      case 'getSignatureStatuses': { statusChecks++; const unseen = options.uncertain || options.expired || statusChecks <= (options.slowConfirm ?? 0); result = { context: { slot: 101 }, value: params[0].map(() => unseen ? null : { slot: 101, confirmations: 1, err: null, confirmationStatus: 'confirmed' }) }; break; }
      case 'getSignaturesForAddress': result = []; break;
      case 'getAccountInfo': result = { context: { slot: 100 }, value: null }; break;
      case 'getTransaction': result = null; break;
      case 'getBlockHeight': result = options.expired ? 999_999 : 100; break;
      default: throw new Error(`Unexpected RPC: ${method}`);
    }
    await route.fulfill({ json: { jsonrpc: '2.0', id, result } });
  });
  return { sends: () => sends, simulations: () => simulations, statusChecks: () => statusChecks };
}
