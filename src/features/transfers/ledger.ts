import { z } from 'zod';
import { isDemo, demoEntries } from '../demo/demo';
import { checkDailyLimit } from './policy';

const entrySchema = z.object({ id: z.string().uuid(), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), createdAt: z.string().datetime(), amount: z.string().regex(/^[1-9][0-9]*$/), sender: z.string(), recipient: z.string(), name: z.string(), status: z.enum(['reserved', 'submission_unknown', 'submitted', 'confirmed', 'failed']), signature: z.string().optional(), signedWire: z.string().optional(), lastValidBlockHeight: z.string().optional() }).strict();
export type LedgerEntry = z.infer<typeof entrySchema>;
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('readback-transfers', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('ledger', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Payment history storage is unavailable. Payment is blocked.'));
    request.onblocked = () => reject(new Error('Payment history is blocked by another tab.'));
  });
}
export async function readLedger(): Promise<LedgerEntry[]> {
  if (isDemo()) return demoEntries();
  const db = await open();
  try { return await new Promise((resolve, reject) => {
    const transaction = db.transaction('ledger', 'readonly');
    const request = transaction.objectStore('ledger').getAll();
    transaction.oncomplete = () => { try { resolve(z.array(entrySchema).parse(request.result)); } catch { reject(new Error('Payment history is invalid. Payments are blocked until reviewed.')); } };
    transaction.onabort = transaction.onerror = () => reject(new Error('Payment history could not be read.'));
  }); } finally { db.close(); }
}
export async function reservePayment(entry: LedgerEntry): Promise<void> {
  if (isDemo()) throw new Error('Demo payments do not use the real ledger.');
  const checked = entrySchema.parse(entry);
  const db = await open();
  try { await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('ledger', 'readwrite');
    const store = transaction.objectStore('ledger');
    const request = store.getAll();
    let message = 'Could not reserve this payment. No transaction was submitted.';
    request.onsuccess = () => {
      try {
        const records = z.array(entrySchema).parse(request.result);
        const used = spentToday(records, checked.sender, checked.day);
        checkDailyLimit(used, BigInt(checked.amount));
        store.add(checked);
      } catch (error) { message = error instanceof Error ? error.message : message; transaction.abort(); }
    };
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () => reject(new Error(message));
  }); } finally { db.close(); }
}
export function spentToday(records: LedgerEntry[], sender: string, day = new Date().toISOString().slice(0, 10)) {
  // Confirmed sends plus unresolved reservations prevent concurrent/uncertain sends bypassing the cap.
  return records.filter(record => record.sender === sender && record.day === day && record.status !== 'failed').reduce((sum, record) => sum + BigInt(record.amount), 0n);
}
export async function updatePayment(id: string, status: LedgerEntry['status'], signature?: string, signed?: { signedWire: string; lastValidBlockHeight: string }): Promise<void> {
  const db = await open();
  try { await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('ledger', 'readwrite');
    const store = transaction.objectStore('ledger');
    const request = store.get(id);
    request.onsuccess = () => {
      try { const old = entrySchema.parse(request.result); store.put(entrySchema.parse({ ...old, status, ...(signature ? { signature } : {}), ...signed })); }
      catch { transaction.abort(); }
    };
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () => reject(new Error('Payment status could not be saved. Check the transaction signature before doing anything else.'));
  }); } finally { db.close(); }
}
