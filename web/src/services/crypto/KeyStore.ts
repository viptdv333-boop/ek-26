/**
 * IndexedDB wrapper for storing private keys and session states.
 *
 * Database: ek26-keys
 * Object stores:
 *   - identity (keyPath: userId)
 *   - oneTimePreKeys (keyPath: keyId)
 *   - sessions (keyPath: recipientUserId)
 */

const DB_NAME = 'ek26-keys';
const DB_VERSION = 1;

export interface IdentityRecord {
  userId: string;
  identityKeyPair: { privateKey: string; publicKey: string }; // base64
  signingKeyPair: { privateKey: string; publicKey: string };   // base64
  signedPreKey: {
    keyId: number;
    keyPair: { privateKey: string; publicKey: string };
    signature: string; // base64
    timestamp: number;
  };
  nextPreKeyId: number;
}

export interface SessionRecord {
  recipientUserId: string;
  ratchetState: object; // serialized RatchetState
  associatedData: string; // base64
  updatedAt: number;
}

export class KeyStore {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('identity')) {
          db.createObjectStore('identity', { keyPath: 'userId' });
        }
        if (!db.objectStoreNames.contains('oneTimePreKeys')) {
          db.createObjectStore('oneTimePreKeys', { keyPath: 'keyId' });
        }
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', { keyPath: 'recipientUserId' });
        }
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }

  private ensureDb(): IDBDatabase {
    if (!this.db) throw new Error('KeyStore not initialized. Call init() first.');
    return this.db;
  }

  private tx(storeName: string, mode: IDBTransactionMode): IDBObjectStore {
    const db = this.ensureDb();
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  private request<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getIdentity(): Promise<IdentityRecord | null> {
    await this.init();
    const store = this.tx('identity', 'readonly');
    const result = await this.request(store.get('self'));
    return result ?? null;
  }

  async saveIdentity(record: IdentityRecord): Promise<void> {
    await this.init();
    const store = this.tx('identity', 'readwrite');
    await this.request(store.put(record));
  }

  async getOneTimePreKey(keyId: number): Promise<{ privateKey: string; publicKey: string } | null> {
    await this.init();
    const store = this.tx('oneTimePreKeys', 'readonly');
    const result = await this.request(store.get(keyId));
    if (!result) return null;
    return { privateKey: result.privateKey, publicKey: result.publicKey };
  }

  async saveOneTimePreKeys(keys: Array<{ keyId: number; privateKey: string; publicKey: string }>): Promise<void> {
    await this.init();
    const db = this.ensureDb();
    const tx = db.transaction('oneTimePreKeys', 'readwrite');
    const store = tx.objectStore('oneTimePreKeys');
    for (const key of keys) {
      store.put(key);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteOneTimePreKey(keyId: number): Promise<void> {
    await this.init();
    const store = this.tx('oneTimePreKeys', 'readwrite');
    await this.request(store.delete(keyId));
  }

  async getSession(recipientUserId: string): Promise<SessionRecord | null> {
    await this.init();
    const store = this.tx('sessions', 'readonly');
    const result = await this.request(store.get(recipientUserId));
    return result ?? null;
  }

  async saveSession(recipientUserId: string, ratchetState: object, associatedData: string): Promise<void> {
    await this.init();
    const store = this.tx('sessions', 'readwrite');
    const record: SessionRecord = {
      recipientUserId,
      ratchetState,
      associatedData,
      updatedAt: Date.now(),
    };
    await this.request(store.put(record));
  }

  async hasSession(recipientUserId: string): Promise<boolean> {
    const session = await this.getSession(recipientUserId);
    return session !== null;
  }

  async clearAll(): Promise<void> {
    await this.init();
    const db = this.ensureDb();
    const storeNames = ['identity', 'oneTimePreKeys', 'sessions'];
    const tx = db.transaction(storeNames, 'readwrite');
    for (const name of storeNames) {
      tx.objectStore(name).clear();
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const keyStore = new KeyStore();
