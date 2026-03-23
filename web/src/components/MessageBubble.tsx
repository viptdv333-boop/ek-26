import { formatFileSize, isImageFile, isVideoFile } from '../services/api/upload';

interface Attachment {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
}

interface Message {
  id: string;
  text?: string | null;
  senderName?: string;
  encrypted?: boolean;
  attachments?: Attachment[];
  createdAt: string;
  status: string;
}

interface Props {
  message: Message;
  isMine: boolean;
  showSender?: boolean;
}

export function MessageBubble({ message, isMine, showSender }: Props) {
  const time = new Date(message.createdAt).toLocaleTimeString('ru', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusIcon = () => {
    if (!isMine) return null;
    switch (message.status) {
      case 'read': return <span className="text-[10px] text-blue-300">✓✓</span>;
      case 'delivered': return <span className="text-[10px]">✓✓</span>;
      default: return <span className="text-[10px]">✓</span>;
    }
  };

  const hasAttachments = message.attachments && message.attachments.length > 0;

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-2xl overflow-hidden ${
          isMine
            ? 'bg-accent text-white rounded-br-md'
            : 'bg-dark-600 text-gray-100 rounded-bl-md'
        } ${hasAttachments && !message.text ? '' : 'px-3.5 py-2'}`}
      >
        {showSender && !isMine && message.senderName && (
          <p className={`text-xs font-medium text-accent mb-0.5 ${hasAttachments && !message.text ? 'px-3.5 pt-2' : ''}`}>
            {message.senderName}
          </p>
        )}

        {/* Attachments */}
        {hasAttachments && message.attachments!.map((att, i) => (
          <AttachmentView key={i} attachment={att} isMine={isMine} />
        ))}

        {/* Text */}
        {message.text && (
          <p className={`text-sm whitespace-pre-wrap break-words ${hasAttachments ? 'px-3.5 pt-1' : ''}`}>
            {message.text}
          </p>
        )}

        {/* Time + status */}
        <div className={`flex items-center justify-end gap-1 mt-0.5 ${
          hasAttachments ? 'px-3.5 pb-2' : ''
        } ${isMine ? 'text-white/50' : 'text-gray-500'}`}>
          <span className="text-[10px]">{time}</span>
          {statusIcon()}
        </div>
      </div>
    </div>
  );
}

function AttachmentView({ attachment, isMine }: { attachment: Attachment; isMine: boolean }) {
  if (isImageFile(attachment.mimeType)) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
        <img
          src={attachment.url}
          alt={attachment.fileName}
          className="max-w-full max-h-[300px] object-cover cursor-pointer"
          loading="lazy"
        />
      </a>
    );
  }

  if (isVideoFile(attachment.mimeType)) {
    return (
      <video
        src={attachment.url}
        controls
        className="max-w-full max-h-[300px]"
        preload="metadata"
      />
    );
  }

  // Document/file
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 px-3.5 py-2 ${
        isMine ? 'hover:bg-white/10' : 'hover:bg-white/5'
      } transition-colors`}
    >
      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{attachment.fileName}</p>
        <p className={`text-[11px] ${isMine ? 'text-white/50' : 'text-gray-500'}`}>
          {formatFileSize(attachment.size)}
        </p>
      </div>
    </a>
  );
}
