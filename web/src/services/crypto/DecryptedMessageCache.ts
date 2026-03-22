/**
 * Simple IndexedDB cache for decrypted message plaintext.
 * Used to avoid re-decrypting messages when reloading chat history.
 *
 * Database: ek26-decrypted
 * Object store: messages (keyPath: messageId)
 */

const DB_NAME = 'ek26-decrypted';
const DB_VERSION = 1;

export class DecryptedMessageCache {
  private db: IDBDatabase | null = null;

  private async init(): Promise<void> {
    if (this.db) return;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('messages')) {
          db.createObjectStore('messages', { keyPath: 'messageId' });
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
    if (!this.db) throw new Error('DecryptedMessageCache not initialized');
    return this.db;
  }

  private request<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async get(messageId: string): Promise<string | null> {
    await this.init();
    const db = this.ensureDb();
    const tx = db.transaction('messages', 'readonly');
    const store = tx.objectStore('messages');
    const result = await this.request(store.get(messageId));
    return result ? result.text : null;
  }

  async put(messageId: string, text: string): Promise<void> {
    await this.init();
    const db = this.ensureDb();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    await this.request(store.put({ messageId, text }));
  }

  async clear(): Promise<void> {
    await this.init();
    const db = this.ensureDb();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    await this.request(store.clear());
  }
}
