import { create } from 'zustand';

export interface ActiveCall {
  callId: string;
  peerId: string;
  peerName: string;
  peerAvatar: string | null;
  type: 'audio' | 'video';
  direction: 'incoming' | 'outgoing';
  status: 'ringing' | 'connecting' | 'connected' | 'ended';
  startedAt: number | null;
  offer?: RTCSessionDescriptionInit;
}

interface CallState {
  activeCall: ActiveCall | null;
  isMuted: boolean;
  isCameraOff: boolean;
  setActiveCall: (call: ActiveCall | null) => void;
  updateCallStatus: (status: ActiveCall['status']) => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  reset: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  activeCall: null,
  isMuted: false,
  isCameraOff: false,

  setActiveCall: (call) => set({ activeCall: call }),

  updateCallStatus: (status) =>
    set((state) => ({
      activeCall: state.activeCall
        ? { ...state.activeCall, status, startedAt: status === 'connected' ? Date.now() : state.activeCall.startedAt }
        : null,
    })),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
  toggleCamera: () => set((state) => ({ isCameraOff: !state.isCameraOff })),

  reset: () => set({ activeCall: null, isMuted: false, isCameraOff: false }),
}));
