import { useEffect, useRef, useState } from 'react';
import { useCallStore } from '../stores/callStore';
import { callManager } from '../services/webrtc/CallManager';

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Phone icon for hang up button
function PhoneDownIcon() {
  return (
    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.68 16.07l3.92-3.11c.35-.28.87-.2 1.12.17l1.54 2.31c2.25-1.16 4.09-3 5.25-5.25l-2.31-1.54a.85.85 0 01-.17-1.12l3.11-3.92c.29-.36.81-.42 1.17-.14l2.77 2.17c.38.3.55.8.43 1.28C19.44 11.63 14.63 16.44 8.91 19.5a1.13 1.13 0 01-1.28-.43L5.46 16.3c-.28-.36-.22-.88.14-1.17z" transform="rotate(135 12 12)" />
    </svg>
  );
}

// Microphone icon
function MicIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  );
}

// Camera icon
function CameraIcon({ off }: { off: boolean }) {
  if (off) {
    return (
      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72m-7.5 7.5h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5m0 0L1.5 2.25m3 3v13.5a2.25 2.25 0 002.25 2.25h10.5" />
      </svg>
    );
  }
  return (
    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
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
    <div className="fixed inset-0 z-50 bg-dark-900/95 flex flex-col">
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

      {/* Center content — avatar, name, status */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        {(!isVideo || !isConnected) && (
          <>
            {activeCall.peerAvatar ? (
              <img
                src={activeCall.peerAvatar}
                alt=""
                className={`w-28 h-28 rounded-full object-cover border-4 ${
                  isRinging ? 'border-accent animate-pulse' : 'border-dark-600'
                }`}
              />
            ) : (
              <div
                className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold ${
                  isRinging ? 'bg-accent/30 text-accent animate-pulse' : 'bg-dark-700 text-gray-300'
                }`}
              >
                {activeCall.peerName[0]?.toUpperCase() || '?'}
              </div>
            )}

            <h2 className="text-2xl font-semibold text-white mt-6">{activeCall.peerName}</h2>
            <p className="text-sm text-gray-400 mt-2">{statusText}</p>
          </>
        )}

        {/* Connected video: show name + timer overlay at top */}
        {isVideo && isConnected && (
          <div className="absolute top-8 left-0 right-0 flex flex-col items-center">
            <h2 className="text-lg font-semibold text-white drop-shadow-lg">{activeCall.peerName}</h2>
            <p className="text-sm text-gray-200 drop-shadow-lg">{elapsed}</p>
          </div>
        )}

        {isEnded && (
          <p className="mt-4 text-sm text-gray-500">Звонок завершён</p>
        )}
      </div>

      {/* Controls — always at bottom */}
      <div className="relative z-10 pb-10 pt-6 flex items-center justify-center gap-6">
        {/* Incoming ringing: decline + accept */}
        {isRinging && isIncoming && (
          <>
            <button
              onClick={() => callManager.declineCall()}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors shadow-lg"
              title="Отклонить"
            >
              <PhoneDownIcon />
            </button>
            <button
              onClick={() => callManager.acceptCall()}
              className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center transition-colors shadow-lg"
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
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors shadow-lg"
            title="Завершить"
          >
            <PhoneDownIcon />
          </button>
        )}

        {/* Connecting: hang up */}
        {isConnecting && (
          <button
            onClick={() => callManager.endCall()}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors shadow-lg"
            title="Завершить"
          >
            <PhoneDownIcon />
          </button>
        )}

        {/* Connected: mic toggle, camera toggle (video), hang up */}
        {isConnected && (
          <>
            <button
              onClick={() => callManager.toggleMute()}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-lg ${
                isMuted ? 'bg-red-600/80 hover:bg-red-600' : 'bg-dark-600 hover:bg-dark-500'
              }`}
              title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
            >
              <MicIcon muted={isMuted} />
            </button>

            {isVideo && (
              <button
                onClick={() => callManager.toggleCamera()}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-lg ${
                  isCameraOff ? 'bg-red-600/80 hover:bg-red-600' : 'bg-dark-600 hover:bg-dark-500'
                }`}
                title={isCameraOff ? 'Включить камеру' : 'Выключить камеру'}
              >
                <CameraIcon off={isCameraOff} />
              </button>
            )}

            <button
              onClick={() => callManager.endCall()}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors shadow-lg"
              title="Завершить"
            >
              <PhoneDownIcon />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
