import { create } from 'zustand';

type TransportType = 'ws' | 'push' | 'rss' | 'mesh';
type TransportStatus = 'connected' | 'degraded' | 'offline';

interface TransportState {
  activeTransport: TransportType;
  status: TransportStatus;
  wsConnected: boolean;
  onlineUsers: Set<string>;

  setTransport: (transport: TransportType) => void;
  setStatus: (status: TransportStatus) => void;
  setWsConnected: (connected: boolean) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
  setOnlineUsers: (userIds: string[]) => void;
}

export const useTransportStore = create<TransportState>((set) => ({
  activeTransport: 'ws',
  status: 'offline',
  wsConnected: false,
  onlineUsers: new Set(),

  setTransport: (activeTransport) => set({ activeTransport }),
  setStatus: (status) => set({ status }),
  setWsConnected: (wsConnected) =>
    set({ wsConnected, status: wsConnected ? 'connected' : 'degraded' }),
  addOnlineUser: (userId) =>
    set((state) => ({ onlineUsers: new Set([...state.onlineUsers, userId]) })),
  removeOnlineUser: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers);
      next.delete(userId);
      return { onlineUsers: next };
    }),
  setOnlineUsers: (userIds) =>
    set({ onlineUsers: new Set(userIds) }),
}));
