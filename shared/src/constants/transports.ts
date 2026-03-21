export const TRANSPORT_PRIORITY = ['ws', 'push', 'rss', 'mesh'] as const;

export const WS_HEARTBEAT_INTERVAL = 15_000; // 15 seconds
export const WS_HEARTBEAT_TIMEOUT = 45_000;  // 3 missed pings
export const WS_RECONNECT_DELAY = 1_000;     // 1 second initial
export const WS_RECONNECT_MAX_DELAY = 30_000; // 30 seconds max

export const RSS_POLL_ACTIVE = 5_000;    // 5 seconds during active chat
export const RSS_POLL_IDLE = 30_000;     // 30 seconds in foreground
export const RSS_POLL_BACKGROUND = 120_000; // 2 minutes in background

export const PUSH_MAX_PAYLOAD = 4096; // 4KB FCM/APNs limit

export const MESSAGE_MAX_LENGTH = 4096;
export const GROUP_MAX_MEMBERS = 256;
export const FILE_MAX_SIZE = 100 * 1024 * 1024; // 100MB
