import { useState, useRef, useEffect, useCallback } from 'react';
import { uploadFile } from '../services/api/upload';

interface Props {
  onSend: (attachment: { fileId: string; fileName: string; mimeType: string; size: number; url: string }) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onSend, onCancel }: Props) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);

  const stopRecording = useCallback(async (send: boolean) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') {
      onCancel();
      return;
    }

    return new Promise<void>((resolve) => {
      mr.onstop = async () => {
        setRecording(false);
        streamRef.current?.getTracks().forEach(t => t.stop());

        if (!send || elapsed < 0.5) {
          onCancel();
          resolve();
          return;
        }

        const mimeType = mr.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const ext = mimeType.includes('ogg') ? 'ogg' : 'webm';
        const file = new File([blob], `voice-${Date.now()}.${ext}`, { type: mimeType });

        setUploading(true);
        try {
          const att = await uploadFile(file);
          onSend(att);
        } catch {
          onCancel();
        } finally {
          setUploading(false);
        }
        resolve();
      };
      mr.stop();
    });
  }, [elapsed, onCancel, onSend]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg';

      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.start(100);
      setRecording(true);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed((Date.now() - startTimeRef.current) / 1000);
      }, 100);
    } catch {
      alert('Не удалось получить доступ к микрофону');
      onCancel();
    }
  }, [onCancel]);

  useEffect(() => {
    startRecording();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [startRecording]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (uploading) {
    return (
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-sm text-gray-400">Отправка...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Cancel */}
      <button
        onClick={() => stopRecording(false)}
        className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-400 hover:bg-dark-600 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Recording indicator */}
      <div className="flex items-center gap-2 flex-1">
        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm text-white font-mono">{fmt(elapsed)}</span>
        <div className="flex-1 flex items-center gap-[2px] h-6">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="flex-1 bg-red-400/60 rounded-full"
              style={{
                height: `${30 + Math.random() * 70}%`,
                animation: recording ? `pulse 0.5s ease-in-out ${i * 0.05}s infinite alternate` : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* Send */}
      <button
        onClick={() => stopRecording(true)}
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent hover:bg-accent-hover transition-colors"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
