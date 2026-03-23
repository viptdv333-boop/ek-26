import { useCallStore } from '../../stores/callStore';
import { wsTransport } from '../transport/WebSocketTransport';

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:85.198.82.136:3478',
      username: 'fomo',
      credential: 'FomoTurn2024!',
    },
  ],
};

class CallManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private localVideoRef: HTMLVideoElement | null = null;
  private remoteVideoRef: HTMLVideoElement | null = null;
  private _ringtone: HTMLAudioElement | null = null;

  setVideoRefs(local: HTMLVideoElement | null, remote: HTMLVideoElement | null) {
    this.localVideoRef = local;
    this.remoteVideoRef = remote;
    if (local && this.localStream) local.srcObject = this.localStream;
    if (remote && this.remoteStream) remote.srcObject = this.remoteStream;
  }

  async startCall(targetUserId: string, targetName: string, targetAvatar: string | null, type: 'audio' | 'video') {
    const store = useCallStore.getState();
    if (store.activeCall) return; // Already in a call

    const callId = crypto.randomUUID();

    // Get media
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
    } catch {
      alert('Не удалось получить доступ к микрофону/камере');
      return;
    }

    // Create peer connection
    this.pc = new RTCPeerConnection(ICE_CONFIG);
    this.remoteStream = new MediaStream();

    // Add local tracks
    this.localStream.getTracks().forEach((track) => {
      this.pc!.addTrack(track, this.localStream!);
    });

    // Handle remote tracks
    this.pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream!.addTrack(track);
      });
      if (this.remoteVideoRef) this.remoteVideoRef.srcObject = this.remoteStream;
    };

    // ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        wsTransport.send('call:ice', {
          targetUserId,
          callId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      console.log('[Call] Connection state:', this.pc?.connectionState);
      if (this.pc?.connectionState === 'connected') {
        useCallStore.getState().updateCallStatus('connected');
      }
      if (this.pc?.connectionState === 'failed' || this.pc?.connectionState === 'disconnected') {
        this.endCall(targetUserId);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log('[Call] ICE state:', this.pc?.iceConnectionState);
    };

    this.pc.onicegatheringstatechange = () => {
      console.log('[Call] ICE gathering:', this.pc?.iceGatheringState);
    };

    // Create offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Set store
    store.setActiveCall({
      callId,
      peerId: targetUserId,
      peerName: targetName,
      peerAvatar: targetAvatar,
      type,
      direction: 'outgoing',
      status: 'ringing',
      startedAt: null,
    });

    // Send offer via WS
    wsTransport.send('call:offer', {
      targetUserId,
      callId,
      type,
      offer: this.pc.localDescription,
    });

    // Auto-end after 30s if not answered
    setTimeout(() => {
      const current = useCallStore.getState().activeCall;
      if (current?.callId === callId && current.status === 'ringing') {
        this.endCall(targetUserId);
      }
    }, 30000);

    // Attach local video
    if (this.localVideoRef) this.localVideoRef.srcObject = this.localStream;
  }

  async handleIncomingCall(data: any) {
    const store = useCallStore.getState();
    if (store.activeCall) {
      // Already in a call -- send busy
      wsTransport.send('call:busy', { callerId: data.callerId, callId: data.callId });
      return;
    }

    store.setActiveCall({
      callId: data.callId,
      peerId: data.callerId,
      peerName: data.callerName,
      peerAvatar: data.callerAvatar,
      type: data.type,
      direction: 'incoming',
      status: 'ringing',
      startedAt: null,
      offer: data.offer,
    });

    // Play ringtone
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==');
      audio.loop = true;
      audio.play().catch(() => {});
      this._ringtone = audio;
    } catch {}
  }

  async acceptCall() {
    const store = useCallStore.getState();
    const call = store.activeCall;
    if (!call || !call.offer) return;

    // Stop ringtone
    this.stopRingtone();

    store.updateCallStatus('connecting');

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: call.type === 'video',
      });
    } catch {
      alert('Не удалось получить доступ к микрофону/камере');
      this.declineCall();
      return;
    }

    this.pc = new RTCPeerConnection(ICE_CONFIG);
    this.remoteStream = new MediaStream();

    this.localStream.getTracks().forEach((track) => {
      this.pc!.addTrack(track, this.localStream!);
    });

    this.pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream!.addTrack(track);
      });
      if (this.remoteVideoRef) this.remoteVideoRef.srcObject = this.remoteStream;
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        wsTransport.send('call:ice', {
          targetUserId: call.peerId,
          callId: call.callId,
          candidate: event.candidate.toJSON(),
        });
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc?.connectionState === 'connected') {
        useCallStore.getState().updateCallStatus('connected');
      }
      if (this.pc?.connectionState === 'failed' || this.pc?.connectionState === 'disconnected') {
        this.endCall(call.peerId);
      }
    };

    await this.pc.setRemoteDescription(new RTCSessionDescription(call.offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    wsTransport.send('call:answer', {
      callerId: call.peerId,
      callId: call.callId,
      answer: this.pc.localDescription,
    });

    if (this.localVideoRef) this.localVideoRef.srcObject = this.localStream;
  }

  async handleAnswer(data: any) {
    console.log('[Call] Received answer');
    if (!this.pc) { console.warn('[Call] No PC for answer'); return; }
    await this.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    useCallStore.getState().updateCallStatus('connecting');
  }

  async handleIceCandidate(data: any) {
    console.log('[Call] Received ICE candidate');
    if (!this.pc) { console.warn('[Call] No PC for ICE'); return; }
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (err) { console.error('[Call] ICE error:', err); }
  }

  declineCall() {
    const call = useCallStore.getState().activeCall;
    if (!call) return;
    this.stopRingtone();
    wsTransport.send('call:decline', { callerId: call.peerId, callId: call.callId });
    this.cleanup();
  }

  endCall(targetUserId?: string) {
    const call = useCallStore.getState().activeCall;
    if (call && targetUserId) {
      wsTransport.send('call:end', { targetUserId, callId: call.callId, reason: 'ended' });
    } else if (call) {
      wsTransport.send('call:end', { targetUserId: call.peerId, callId: call.callId, reason: 'ended' });
    }
    this.stopRingtone();
    this.cleanup();
  }

  handleCallEnded() {
    this.stopRingtone();
    this.cleanup();
  }

  handleCallDeclined() {
    this.stopRingtone();
    useCallStore.getState().updateCallStatus('ended');
    setTimeout(() => this.cleanup(), 2000);
  }

  handleCallBusy() {
    this.stopRingtone();
    useCallStore.getState().updateCallStatus('ended');
    setTimeout(() => this.cleanup(), 2000);
  }

  toggleMute() {
    const store = useCallStore.getState();
    store.toggleMute();
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = store.isMuted; // toggleMute already flipped it
      });
    }
  }

  toggleCamera() {
    const store = useCallStore.getState();
    store.toggleCamera();
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((t) => {
        t.enabled = store.isCameraOff; // toggleCamera already flipped it
      });
    }
  }

  private stopRingtone() {
    try {
      this._ringtone?.pause();
      this._ringtone = null;
    } catch {}
  }

  private cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((t) => t.stop());
      this.remoteStream = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.localVideoRef) this.localVideoRef.srcObject = null;
    if (this.remoteVideoRef) this.remoteVideoRef.srcObject = null;
    useCallStore.getState().reset();
  }

  getLocalStream() { return this.localStream; }
  getRemoteStream() { return this.remoteStream; }
}

export const callManager = new CallManager();
