import { useEffect, useRef, useState } from 'react';
import { useCallStore } from '../stores/callStore';
import { callManager } from '../services/webrtc/CallManager';

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function CallOverlay() {
  const activeCall = useCallStore((s) => s.activeCall);
  const isMuted = useCallStore((s) => s.isMuted);
  const isCameraOff = useCallStore((s) => s.isCameraOff);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [elapsed, setElapsed] = useState('00:00');

  // Register video refs with CallManager
  useEffect(() => {
    if (activeCall) {
      callManager.setVideoRefs(localVideoRef.current, remoteVideoRef.current);
    }
  }, [activeCall, localVideoRef.current, remoteVideoRef.current]);

  // Timer for connected calls
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected' || !activeCall.startedAt) return;
    const interval = setInterval(() => {
      setElapsed(formatDuration(Date.now() - activeCall.startedAt!));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall?.status, activeCall?.startedAt]);

  // Reset timer when call ends
  useEffect(() => {
    if (!activeCall) setElapsed('00:00');
  }, [activeCall]);

  if (!activeCall) return null;

  const isVideo = activeCall.type === 'video';
  const isRinging = activeCall.status === 'ringing';
  const isConnecting = activeCall.status === 'connecting';
  const isConnected = activeCall.status === 'connected';
  const isEnded = activeCall.status === 'ended';
  const isIncoming = activeCall.direction === 'incoming';

  const statusText = isEnded
    ? 'Звонок завершён'
    : isRinging && isIncoming
      ? 'Входящий звонок'
      : isRinging
        ? 'Вызов...'
        : isConnecting
          ? 'Соединение...'
          : elapsed;

  return (
    <div className="fixed inset-0 z-50 bg-dark-900/95 flex flex-col items-center justify-center">
      {/* Remote video (full background for video calls) */}
      {isVideo && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Local video PiP (small corner) */}
      {isVideo && isConnected && (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute top-4 right-4 w-32 h-44 rounded-xl object-cover border-2 border-dark-600 z-10"
        />
      )}

      {/* Audio-only local video (hidden but needed for ref) */}
      {!isVideo && (
        <>
          <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
          <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
        </>
      )}

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Avatar */}
        {(!isVideo || !isConnected) && (
          <>
            {activeCall.peerAvatar ? (
              <img
                src={activeCall.peerAvatar}
                alt=""
                className={`w-24 h-24 rounded-full object-cover border-4 ${
                  isRinging ? 'border-accent animate-pulse' : 'border-dark-600'
                }`}
              />
            ) : (
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold ${
                  isRinging ? 'bg-accent/30 text-accent animate-pulse' : 'bg-dark-700 text-gray-300'
                }`}
              >
                {activeCall.peerName[0]?.toUpperCase() || '?'}
              </div>
            )}

            {/* Name */}
            <h2 className="text-xl font-semibold text-white">{activeCall.peerName}</h2>

            {/* Status */}
            <p className="text-sm text-gray-400">{statusText}</p>
          </>
        )}

        {/* Connected video: show name + timer overlay at top */}
        {isVideo && isConnected && (
          <div className="absolute top-8 left-0 right-0 flex flex-col items-center">
            <h2 className="text-lg font-semibold text-white drop-shadow-lg">{activeCall.peerName}</h2>
            <p className="text-sm text-gray-200 drop-shadow-lg">{elapsed}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="relative z-10 mt-12 flex items-center gap-6">
        {/* Incoming ringing: accept + decline */}
        {isRinging && isIncoming && (
          <>
            <button
              onClick={() => callManager.declineCall()}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors"
              title="Отклонить"
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={() => callManager.acceptCall()}
              className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center transition-colors"
              title="Принять"
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
            </button>
          </>
        )}

        {/* Outgoing ringing: just hang up */}
        {isRinging && !isIncoming && (
          <button
            onClick={() => callManager.endCall()}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors"
            title="Завершить"
          >
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Connecting: hang up */}
        {isConnecting && (
          <button
            onClick={() => callManager.endCall()}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors"
            title="Завершить"
          >
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Connected: mute, camera toggle (video), hang up */}
        {isConnected && (
          <>
            <button
              onClick={() => callManager.toggleMute()}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? 'bg-red-600/80 hover:bg-red-600' : 'bg-dark-600 hover:bg-dark-500'
              }`}
              title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
            >
              {isMuted ? (
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 19L5 5m14 0v4a2 2 0 01-2 2H7m0 0v2a5 5 0 0010 0v-2M7 11V7a5 5 0 0110 0" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>

            {isVideo && (
              <button
                onClick={() => callManager.toggleCamera()}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
                  isCameraOff ? 'bg-red-600/80 hover:bg-red-600' : 'bg-dark-600 hover:bg-dark-500'
                }`}
                title={isCameraOff ? 'Включить камеру' : 'Выключить камеру'}
              >
                {isCameraOff ? (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72m-7.5 7.5h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5m0 0L1.5 2.25m3 3v13.5a2.25 2.25 0 002.25 2.25h10.5" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                )}
              </button>
            )}

            <button
              onClick={() => callManager.endCall()}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors"
              title="Завершить"
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Ended state: auto-dismiss */}
      {isEnded && (
        <p className="relative z-10 mt-4 text-sm text-gray-500">Звонок завершён</p>
      )}
    </div>
  );
}
