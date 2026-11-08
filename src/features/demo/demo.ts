/**
 * Passwordless demo account. Fictional, deterministic data kept in localStorage.
 * Isolated from the real wallet: it never reads or writes IndexedDB, and the Devnet client
 * refuses to run while the demo is active, so nothing can reach Solana.
 */
const SESSION_KEY = 'readback-session';
const DATA_KEY = 'readback-demo';
const DAY = 86_400_000;

export const DEMO_ADDRESS = 'DemoWa11etRead6ackXyz7QpLmN9vTuHs3KdFgJwEc4';
export const DEMO_NAME = 'Amara';
export const DEMO_START_LAMPORTS = 3_200_000_000n;

export type DemoEntry = { id: string; day: string; createdAt: string; amount: string; sender: string; recipient: string; name: string; status: 'confirmed'; signature: string };
type DemoData = { startedAt: string; entries: DemoEntry[] };

export const demoContacts = [
  { id: '00000000-0000-4000-8000-000000000001', name: 'Mum', address: 'Mum7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgA', normalizedName: 'mum', network: 'devnet' as const, verifiedAt: '2026-11-01T09:00:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000002', name: 'Tunde', address: 'Tun9pQ4vRb2HcLsWz8YeKfN3mDxA6uGjT5rE1oVhBiSc', normalizedName: 'tunde', network: 'devnet' as const, verifiedAt: '2026-11-02T09:00:00.000Z' },
  { id: '00000000-0000-4000-8000-000000000003', name: 'Ada', address: 'Ada3kWm8ZsQxPv2NbT7cHeYgR4uLfJ9oD6iA1EnKsVpB', normalizedName: 'ada', network: 'devnet' as const, verifiedAt: '2026-11-03T09:00:00.000Z' },
];

const store = {
  get(key: string) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* Demo lasts this page only. */ } },
  remove(key: string) { try { localStorage.removeItem(key); } catch { /* Nothing to clear. */ } },
};

export function isDemo() { return store.get(SESSION_KEY) === 'demo'; }

function seed(now = Date.now()): DemoData {
  const at = (daysAgo: number, hour: number) => { const d = new Date(now - daysAgo * DAY); d.setHours(hour, 15, 0, 0); return d.toISOString(); };
  const entry = (n: number, daysAgo: number, hour: number, lamports: bigint, contact: number): DemoEntry => {
    const createdAt = at(daysAgo, hour);
    return { id: `00000000-0000-4000-9000-00000000000${n}`, day: createdAt.slice(0, 10), createdAt, amount: lamports.toString(), sender: DEMO_ADDRESS, recipient: demoContacts[contact].address, name: demoContacts[contact].name, status: 'confirmed', signature: `demo${n}SignatureNotOnChain` };
  };
  return { startedAt: new Date(now).toISOString(), entries: [entry(1, 5, 10, 250_000_000n, 0), entry(2, 3, 16, 100_000_000n, 1), entry(3, 1, 12, 400_000_000n, 2), entry(4, 0, 9, 150_000_000n, 0)] };
}
function read(): DemoData {
  try { const data = JSON.parse(store.get(DATA_KEY) ?? 'null') as DemoData | null; if (data?.entries) return data; } catch { /* Reseed below. */ }
  const fresh = seed(); store.set(DATA_KEY, JSON.stringify(fresh)); return fresh;
}

export function startDemo() { store.set(SESSION_KEY, 'demo'); store.set(DATA_KEY, JSON.stringify(seed())); }
export function endDemo() { store.remove(SESSION_KEY); store.remove(DATA_KEY); }
export function demoEntries(): DemoEntry[] { return [...read().entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
export function demoBalance(): bigint { return read().entries.reduce((sum, e) => sum - BigInt(e.amount) - 5000n, DEMO_START_LAMPORTS); }
export function recordDemoPayment(contactId: string, lamports: bigint): DemoEntry {
  const data = read();
  const contact = demoContacts.find(c => c.id === contactId);
  if (!contact) throw new Error('I only send to saved contacts.');
  const createdAt = new Date().toISOString();
  const n = data.entries.length + 1;
  const entry: DemoEntry = { id: crypto.randomUUID(), day: createdAt.slice(0, 10), createdAt, amount: lamports.toString(), sender: DEMO_ADDRESS, recipient: contact.address, name: contact.name, status: 'confirmed', signature: `demo${n}SignatureNotOnChain` };
  data.entries.push(entry); store.set(DATA_KEY, JSON.stringify(data));
  return entry;
}
export const isDemoSignature = (signature?: string) => Boolean(signature?.startsWith('demo'));

/** Display name kept in this browser only. */
const PROFILE_KEY = 'readback-profile';
export function profileName(): string { if (isDemo()) return DEMO_NAME; try { return (JSON.parse(store.get(PROFILE_KEY) ?? '{}') as { name?: string }).name ?? ''; } catch { return ''; } }
export function saveProfileName(name: string) { const clean = name.trim().slice(0, 40); if (clean) store.set(PROFILE_KEY, JSON.stringify({ name: clean })); }
