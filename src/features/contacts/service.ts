import { address } from '@solana/kit';
import { z } from 'zod';

const nameSchema = z.string().trim().min(1, 'Enter a contact name.').max(40, 'Use 40 characters or fewer.').regex(/^[^\p{C}]+$/u, 'Remove invisible or control characters.');
const contactSchema = z.object({ id: z.string().uuid(), name: nameSchema, normalizedName: z.string(), address: z.string(), network: z.literal('devnet'), verifiedAt: z.string().datetime() }).strict();
export type Contact = z.infer<typeof contactSchema>;

export function validateContact(name: string, destination: string) {
  const parsed = nameSchema.parse(name).normalize('NFC');
  // Addresses have no network prefix. The user's independent verification is required too.
  const validated = address(destination.trim());
  return { name: parsed, normalizedName: parsed.toLocaleLowerCase('en-US'), address: validated };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('Contact storage is unavailable.')); return; }
    const request = indexedDB.open('readback-contacts', 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('contacts', { keyPath: 'id' });
      store.createIndex('normalizedName', 'normalizedName', { unique: true });
      store.createIndex('address', 'address', { unique: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Saved contacts could not be opened.'));
    request.onblocked = () => reject(new Error('Close other Readback tabs and reload contacts.'));
  });
}

export async function listContacts(): Promise<Contact[]> {
  const db = await openDatabase();
  try {
    const records = await new Promise<unknown[]>((resolve, reject) => {
      const transaction = db.transaction('contacts', 'readonly');
      const request = transaction.objectStore('contacts').getAll();
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(new Error('Saved contacts could not be read.'));
      transaction.onabort = () => reject(new Error('Reading contacts was interrupted.'));
    });
    return records.map(record => {
      const parsed = contactSchema.parse(record);
      const checked = validateContact(parsed.name, parsed.address);
      if (checked.normalizedName !== parsed.normalizedName) throw new Error('Saved contact data is inconsistent.');
      return parsed;
    }).sort((a, b) => a.name.localeCompare(b.name));
  } finally { db.close(); }
}

export async function saveContact(input: { name: string; address: string; independentlyVerified: boolean; suffix: string }): Promise<Contact> {
  if (!input.independentlyVerified) throw new Error('Independently verify the full address before saving.');
  const checked = validateContact(input.name, input.address);
  if (input.suffix !== checked.address.slice(-4)) throw new Error('The last four characters do not match. Review the full address again.');
  const contact: Contact = { ...checked, id: crypto.randomUUID(), network: 'devnet', verifiedAt: new Date().toISOString() };
  await mutate(store => store.add(contact));
  return contact;
}

async function mutate(action: (store: IDBObjectStore) => IDBRequest): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('contacts', 'readwrite');
      action(transaction.objectStore('contacts'));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Could not save the change. Contact names and addresses must be unique.'));
      transaction.onabort = () => reject(new Error('The contact change was not saved. Check for a duplicate name or address.'));
    });
  } finally { db.close(); }
}

export async function removeContact(id: string): Promise<void> { await mutate(store => store.delete(id)); }

export async function renameContact(id: string, name: string): Promise<void> {
  const existing = (await listContacts()).find(contact => contact.id === id);
  if (!existing) throw new Error('That saved contact no longer exists.');
  const checked = validateContact(name, existing.address);
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('contacts', 'readwrite');
      const store = transaction.objectStore('contacts');
      const request = store.get(id);
      request.onsuccess = () => {
        if (!request.result || request.result.address !== existing.address) { transaction.abort(); return; }
        store.put({ ...existing, name: checked.name, normalizedName: checked.normalizedName });
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('The new name could not be saved. It may already be in use.'));
      transaction.onabort = () => reject(new Error('The contact changed in another tab. Reload before editing.'));
    });
  } finally { db.close(); }
}
