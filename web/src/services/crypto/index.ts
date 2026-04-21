export { KeyStore, keyStore } from './KeyStore';
export type { IdentityRecord, SessionRecord } from './KeyStore';
export { KeyManager } from './KeyManager';
export { SessionManager } from './SessionManager';
export { DecryptedMessageCache } from './DecryptedMessageCache';
export { SenderKeyStore, senderKeyStore } from './SenderKeyStore';
export { SenderKeyManager, senderKeyManager } from './SenderKeyManager';

// Lazy-initialized singletons
import { KeyStore } from './KeyStore';
import { KeyManager } from './KeyManager';
import { SessionManager } from './SessionManager';
import { DecryptedMessageCache } from './DecryptedMessageCache';

const _keyStore = new KeyStore();
export const keyManager = new KeyManager(_keyStore);
export const sessionManager = new SessionManager(_keyStore);
export const messageCache = new DecryptedMessageCache();
