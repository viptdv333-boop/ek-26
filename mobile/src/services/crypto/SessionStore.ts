/**
 * SessionStore — manages Double Ratchet sessions per conversation.
 *
 * Each conversation has its own ratchet state. States are persisted
 * to local storage so sessions survive app restarts.
 */
import {
  RatchetState,
  serializeRatchetState,
  deserializeRatchetState,
} from '@ek-26/shared';

// In-memory store (would use react-native-mmkv with encryption in production)
const storage = new Map<string, string>();

/** Map of conversationId -> active RatchetState */
const sessions = new Map<string, RatchetState>();

/**
 * Get the ratchet session for a conversation.
 * Returns null if no session exists (need X3DH to establish one).
 */
export function getSession(conversationId: string): RatchetState | null {
  // Check in-memory first
  if (sessions.has(conversationId)) {
    return sessions.get(conversationId)!;
  }

  // Try loading from storage
  const stored = storage.get(`session:${conversationId}`);
  if (stored) {
    const state = deserializeRatchetState(JSON.parse(stored));
    sessions.set(conversationId, state);
    return state;
  }

  return null;
}

/**
 * Save/update a ratchet session for a conversation.
 * Call this after every encrypt/decrypt operation.
 */
export function saveSession(conversationId: string, state: RatchetState): void {
  sessions.set(conversationId, state);
  const serialized = JSON.stringify(serializeRatchetState(state));
  storage.set(`session:${conversationId}`, serialized);
}

/**
 * Delete a session (e.g., when resetting encryption for a conversation).
 */
export function deleteSession(conversationId: string): void {
  sessions.delete(conversationId);
  storage.delete(`session:${conversationId}`);
}

/**
 * Check if a session exists for a conversation.
 */
export function hasSession(conversationId: string): boolean {
  return sessions.has(conversationId) || storage.has(`session:${conversationId}`);
}

/**
 * Get all conversation IDs with active sessions.
 */
export function getAllSessionIds(): string[] {
  const ids = new Set<string>();
  for (const key of sessions.keys()) ids.add(key);
  for (const key of storage.keys()) {
    if (key.startsWith('session:')) {
      ids.add(key.slice(8));
    }
  }
  return Array.from(ids);
}
