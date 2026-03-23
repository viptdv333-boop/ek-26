import { useState } from 'react';
import { formatFileSize, isImageFile, isVideoFile } from '../services/api/upload';

interface Attachment {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
}

interface ReplyTo {
  id: string;
  text: string | null;
  senderName: string;
}

interface ForwardedFrom {
  originalSenderName: string;
  originalText: string | null;
}

interface Message {
  id: string;
  text?: string | null;
  senderName?: string;
  senderAvatarUrl?: string | null;
  encrypted?: boolean;
  attachments?: Attachment[];
  replyTo?: ReplyTo | null;
  forwardedFrom?: ForwardedFrom | null;
  createdAt: string;
  status: string;
}

interface Props {
  message: Message;
  isMine: boolean;
  showSender?: boolean;
  showAvatar?: boolean;
  myAvatarUrl?: string | null;
  onReply?: (msg: Message) => void;
  onForward?: (msg: Message) => void;
}

export function MessageBubble({ message, isMine, showSender, showAvatar = true, myAvatarUrl, onReply, onForward }: Props) {
  const [showActions, setShowActions] = useState(false);

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

  const avatarUrl = isMine ? myAvatarUrl : message.senderAvatarUrl;
  const avatarInitial = isMine ? '' : (message.senderName?.[0]?.toUpperCase() || '?');

  const renderAvatar = () => {
    if (!showAvatar) return null;
    if (avatarUrl) {
      return <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />;
    }
    if (!isMine) {
      return (
        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
          <span className="text-accent text-[10px] font-medium">{avatarInitial}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`flex ${isMine ? 'justify-end' : 'justify-start'} group items-end gap-1.5`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar for received messages */}
      {!isMine && renderAvatar()}

      {/* Action buttons (left for mine, right for theirs) */}
      {isMine && showActions && (
        <div className="flex items-center gap-1 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onForward && (
            <button onClick={() => onForward(message)} className="p-1 text-gray-500 hover:text-white" title="Переслать">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              </svg>
            </button>
          )}
          {onReply && (
            <button onClick={() => onReply(message)} className="p-1 text-gray-500 hover:text-white" title="Ответить">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </button>
          )}
        </div>
      )}

      <div
        className={`max-w-[70%] rounded-2xl overflow-hidden ${
          isMine
            ? 'bg-accent text-white rounded-br-md'
            : 'bg-dark-600 text-gray-100 rounded-bl-md'
        } ${hasAttachments && !message.text && !message.replyTo && !message.forwardedFrom ? '' : 'px-3.5 py-2'}`}
      >
        {showSender && !isMine && message.senderName && (
          <p className="text-xs font-medium text-accent mb-0.5">{message.senderName}</p>
        )}

        {/* Forwarded header */}
        {message.forwardedFrom && (
          <div className={`text-[11px] mb-1 ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
            Переслано от {message.forwardedFrom.originalSenderName}
          </div>
        )}

        {/* Reply quote */}
        {message.replyTo && (
          <div className={`border-l-2 border-accent pl-2 mb-1.5 py-0.5 ${isMine ? 'border-white/40' : 'border-accent'}`}>
            <p className={`text-[11px] font-medium ${isMine ? 'text-white/70' : 'text-accent'}`}>
              {message.replyTo.senderName}
            </p>
            <p className={`text-[11px] truncate ${isMine ? 'text-white/50' : 'text-gray-400'}`}>
              {message.replyTo.text || 'Сообщение'}
            </p>
          </div>
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
          hasAttachments && !message.text ? 'px-3.5 pb-2' : ''
        } ${isMine ? 'text-white/50' : 'text-gray-500'}`}>
          <span className="text-[10px]">{time}</span>
          {statusIcon()}
        </div>
      </div>

      {/* Avatar for sent messages */}
      {isMine && myAvatarUrl && showAvatar && (
        <img src={myAvatarUrl} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
      )}

      {/* Action buttons for received messages */}
      {!isMine && showActions && (
        <div className="flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onReply && (
            <button onClick={() => onReply(message)} className="p-1 text-gray-500 hover:text-white" title="Ответить">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
            </button>
          )}
          {onForward && (
            <button onClick={() => onForward(message)} className="p-1 text-gray-500 hover:text-white" title="Переслать">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AttachmentView({ attachment, isMine }: { attachment: Attachment; isMine: boolean }) {
  if (isImageFile(attachment.mimeType)) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
        <img src={attachment.url} alt={attachment.fileName} className="max-w-full max-h-[300px] object-cover cursor-pointer" loading="lazy" />
      </a>
    );
  }

  if (isVideoFile(attachment.mimeType)) {
    return <video src={attachment.url} controls className="max-w-full max-h-[300px]" preload="metadata" />;
  }

  return (
    <a href={attachment.url} target="_blank" rel="noopener noreferrer"
      className={`flex items-center gap-3 px-3.5 py-2 ${isMine ? 'hover:bg-white/10' : 'hover:bg-white/5'} transition-colors`}>
      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{attachment.fileName}</p>
        <p className={`text-[11px] ${isMine ? 'text-white/50' : 'text-gray-500'}`}>{formatFileSize(attachment.size)}</p>
      </div>
    </a>
  );
}
