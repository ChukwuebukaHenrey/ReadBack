import { createClient, createSignerFromKeyPair, generateKeyPairSigner } from '@solana/kit';
import type { KeyPairSigner } from '@solana/kit';
import { solanaDevnetRpc } from '@solana/kit-plugin-rpc';
import { signer } from '@solana/kit-plugin-signer';

const DB_NAME = 'readback-devnet';
const STORE = 'wallets';
const GENESIS_HASH = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
export { GENESIS_HASH };
type StoredWallet = { version: 1; network: 'devnet'; address: string; createdAt: string; keyPair: CryptoKeyPair };
export type PublicWallet = { address: string; createdAt: string; persistent: true };
export type Balance = { lamports: bigint; slot: bigint; checkedAt: string };
let activeSigner: KeyPairSigner | null = null;
let creation: Promise<PublicWallet> | null = null;
const changes = new EventTarget();
/** Public-address-only change notifications for UI such as the header. */
export function onWalletChange(listener: () => void) {
  changes.addEventListener('change', listener);
  return () => changes.removeEventListener('change', listener);
}

// Used only by the local transaction service; never expose this object to React or the API.
export async function paymentSigner() {
  const wallet = await loadWallet();
  if (!wallet || !activeSigner) throw new Error('Create or reload your Devnet wallet first.');
  return activeSigner;
}

function openDatabase(): Promise<IDBDatabase> {
  if (!globalThis.isSecureContext || !globalThis.crypto?.subtle || !globalThis.indexedDB) {
    return Promise.reject(new Error('This browser needs HTTPS, WebCrypto Ed25519 and IndexedDB for a persistent test wallet. No wallet was created.'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Wallet storage could not be opened. Existing data has not been replaced.'));
    request.onblocked = () => reject(new Error('Wallet storage is blocked by another tab. Close other Readback tabs and try again.'));
  });
}

async function readStored(): Promise<unknown> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).get('primary');
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(new Error('Saved wallet could not be read. It has not been replaced.'));
      transaction.onabort = () => reject(new Error('Reading the saved wallet was interrupted.'));
    });
  } finally { db.close(); }
}

async function validateStored(value: unknown): Promise<PublicWallet> {
  if (!value || typeof value !== 'object') throw new Error('Saved wallet data is invalid. It has not been replaced.');
  const record = value as Partial<StoredWallet>;
  if (record.version !== 1 || record.network !== 'devnet' || typeof record.address !== 'string' || typeof record.createdAt !== 'string' || Number.isNaN(Date.parse(record.createdAt))) throw new Error('Saved wallet metadata is invalid. It has not been replaced.');
  const pair = record.keyPair;
  if (!pair || !(pair.privateKey instanceof CryptoKey) || !(pair.publicKey instanceof CryptoKey) || pair.privateKey.type !== 'private' || pair.publicKey.type !== 'public' || pair.privateKey.extractable || pair.privateKey.algorithm.name !== 'Ed25519' || pair.publicKey.algorithm.name !== 'Ed25519') throw new Error('The saved wallet key is unavailable or unsupported. Existing data has not been replaced.');
  const restored = await createSignerFromKeyPair(pair);
  if (restored.address !== record.address) throw new Error('Saved wallet address does not match its public key. Existing data has not been replaced.');
  // A fixed local integrity challenge verifies that the persisted key pair survived cloning.
  // It is not a transaction, is never supplied by AI and is never transmitted.
  const challenge = new TextEncoder().encode('readback/devnet-wallet-integrity/v1');
  const proof = await crypto.subtle.sign('Ed25519', pair.privateKey, challenge);
  if (!await crypto.subtle.verify('Ed25519', pair.publicKey, proof, challenge)) throw new Error('The saved wallet key pair could not be verified. It has not been replaced.');
  activeSigner = restored;
  return { address: restored.address, createdAt: record.createdAt, persistent: true };
}

export async function loadWallet(): Promise<PublicWallet | null> {
  const stored = await readStored();
  if (stored === undefined) { activeSigner = null; return null; }
  try { return await validateStored(stored); }
  catch (error) { activeSigner = null; throw error; }
}

export function createWallet(): Promise<PublicWallet> {
  if (creation) return creation;
  creation = (async () => {
    const existing = await loadWallet();
    if (existing) return existing;
    const generated = await generateKeyPairSigner(false);
    if (generated.keyPair.privateKey.extractable) throw new Error('This browser did not create a non-extractable key. No wallet was saved.');
    const record: StoredWallet = { version: 1, network: 'devnet', address: generated.address, createdAt: new Date().toISOString(), keyPair: generated.keyPair };
    const db = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE, 'readwrite');
        // add, never put: two tabs cannot silently replace each other's identity.
        transaction.objectStore(STORE).add(record, 'primary');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error('The wallet could not be saved, or another tab already created one. Reload to check the saved wallet.'));
        transaction.onabort = () => reject(new Error('Wallet storage was interrupted. Reload to check before creating another wallet.'));
      });
    } finally { db.close(); }
    // Read back and verify the actual persisted CryptoKeys before claiming success.
    const saved = await loadWallet();
    if (!saved || saved.address !== generated.address) throw new Error('Wallet persistence could not be verified. Reload to check saved data.');
    changes.dispatchEvent(new Event('change'));
    return saved;
  })().finally(() => { creation = null; });
  return creation;
}

export async function readBalance(wallet: PublicWallet, abortSignal: AbortSignal): Promise<Balance> {
  if (!activeSigner || wallet.address !== activeSigner.address) throw new Error('Reload the saved wallet before checking its balance.');
  const configured = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  if (configured.replace(/\/$/, '') !== 'https://api.devnet.solana.com') throw new Error('This demo only permits the official Solana Devnet endpoint. No other network was contacted.');
  const client = createClient().use(signer(activeSigner)).use(solanaDevnetRpc({
    rpcUrl: new URL('/api/devnet', window.location.origin).href,
    transactionConfig: { version: 1 },
  }));
  const network = await client.rpc.getGenesisHash().send({ abortSignal });
  if (network !== GENESIS_HASH) throw new Error('Network verification failed. This endpoint is not Solana Devnet.');
  const result = await client.rpc.getBalance(activeSigner.address, { commitment: 'confirmed' }).send({ abortSignal });
  if (result.value < 0n) throw new Error('The network returned an invalid balance.');
  return { lamports: result.value, slot: result.context.slot, checkedAt: new Date().toISOString() };
}

/** Permanently deletes the browser-local Devnet key. Callers must obtain explicit confirmation first. */
export async function resetWallet(): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).delete('primary');
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () => reject(new Error('The wallet could not be reset. Nothing was deleted.'));
    });
  } finally { db.close(); }
  activeSigner = null;
  changes.dispatchEvent(new Event('change'));
}
