import { useState } from 'react';
import { formatFileSize, isImageFile, isVideoFile } from '../services/api/upload';
import { MessageContextMenu } from './MessageContextMenu';
import { ImageLightbox } from './ImageLightbox';
import { VoicePlayer } from './VoicePlayer';

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

export interface MessageData {
  id: string;
  text?: string | null;
  senderName?: string;
  senderAvatarUrl?: string | null;
  encrypted?: boolean;
  attachments?: Attachment[];
  replyTo?: ReplyTo | null;
  forwardedFrom?: ForwardedFrom | null;
  reactions?: Array<{ emoji: string; userId: string }>;
  editedAt?: string;
  createdAt: string;
  status: string;
}

interface Props {
  message: MessageData;
  isMine: boolean;
  showSender?: boolean;
  showAvatar?: boolean;
  myAvatarUrl?: string | null;
  onReply?: (msg: MessageData) => void;
  onForward?: (msg: MessageData) => void;
  onEdit?: (msg: MessageData) => void;
  onDelete?: (msg: MessageData) => void;
  onPin?: (msg: MessageData) => void;
  onReact?: (msg: MessageData, emoji: string) => void;
  userId?: string;
  fontSize?: number;
  bubbleShape?: string;
  bubbleColor?: string;
  bubbleColorOther?: string;
}

export function MessageBubble({ message, isMine, showSender, showAvatar = true, myAvatarUrl, onReply, onForward, onEdit, onDelete, onPin, onReact, userId, fontSize = 14, bubbleShape = 'rounded', bubbleColor = '#6366f1', bubbleColorOther = '#22222f' }: Props) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; fileName: string } | null>(null);
  const [showReactionBar, setShowReactionBar] = useState(false);
  const REACTION_EMOJIS = ['👍','❤️','😂','😮','😢','🔥','👎','🎉'];

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

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const getContextMenuItems = () => {
    const items = [];
    if (onReply) items.push({ label: 'Ответить', icon: 'reply', onClick: () => onReply(message) });
    if (onForward) items.push({ label: 'Переслать', icon: 'forward', onClick: () => onForward(message) });
    if (isMine && onEdit && message.text) items.push({ label: 'Редактировать', icon: 'edit', onClick: () => onEdit(message) });
    if (onPin) items.push({ label: 'Закрепить', icon: 'pin', onClick: () => onPin(message) });
    if (onDelete) items.push({ label: 'Удалить', icon: 'delete', onClick: () => onDelete(message), danger: true });
    return items;
  };

  const renderAvatar = () => {
    if (!showAvatar) return <div className="w-7 flex-shrink-0" />;
    if (avatarUrl) return <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />;
    if (!isMine) {
      return (
        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
          <span className="text-accent text-[10px] font-medium">{message.senderName?.[0]?.toUpperCase() || '?'}</span>
        </div>
      );
    }
    return <div className="w-7 flex-shrink-0" />;
  };

  return (
    <>
      <div
        className={`flex ${isMine ? 'justify-end' : 'justify-start'} group items-end gap-1.5 relative`}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setShowReactionBar(true)}
        onMouseLeave={() => setShowReactionBar(false)}
      >
        {!isMine && renderAvatar()}

        <div className={`max-w-[70%] relative ${isMine ? 'text-white' : 'text-gray-100'}`}>
          {/* Tail SVG */}
          <svg
            className="absolute bottom-0"
            style={{ [isMine ? 'right' : 'left']: '-8px' }}
            width="12" height="16" viewBox="0 0 12 16"
          >
            {bubbleShape === 'square' ? (
              // Square: sharp angular tail
              isMine
                ? <path d="M0 0 L0 16 L12 16 Z" fill={bubbleColor} />
                : <path d="M12 0 L12 16 L0 16 Z" fill={bubbleColorOther} />
            ) : bubbleShape === 'cloud' ? (
              // Cloud: smooth curved tail
              isMine
                ? <path d="M0 0 Q0 12 10 16 Q4 12 0 16 Z" fill={bubbleColor} />
                : <path d="M12 0 Q12 12 2 16 Q8 12 12 16 Z" fill={bubbleColorOther} />
            ) : (
              // Rounded: pointed tail
              isMine
                ? <path d="M0 0 C0 8 4 14 12 16 L0 16 Z" fill={bubbleColor} />
                : <path d="M12 0 C12 8 8 14 0 16 L12 16 Z" fill={bubbleColorOther} />
            )}
          </svg>
          <div
            className={`relative overflow-hidden ${
              bubbleShape === 'square' ? 'rounded-md' :
              bubbleShape === 'cloud' ? '' :
              'rounded-2xl'
            } ${hasAttachments && !message.text && !message.replyTo && !message.forwardedFrom ? '' : bubbleShape === 'cloud' ? 'px-5 py-2.5' : 'px-3.5 py-2'}`}
            style={{
              backgroundColor: isMine ? bubbleColor : bubbleColorOther,
              ...(bubbleShape === 'cloud' ? { borderRadius: '1.5rem 1.5rem 1.5rem 1.5rem / 50% 50% 50% 50%' } : {}),
            }}
          >
          {showSender && !isMine && message.senderName && (
            <p className="text-xs font-medium text-accent mb-0.5">{message.senderName}</p>
          )}

          {message.forwardedFrom && (
            <div className={`text-[11px] mb-1 ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
              Переслано от {message.forwardedFrom.originalSenderName}
            </div>
          )}

          {message.replyTo && (
            <div className={`border-l-2 pl-2 mb-1.5 py-0.5 ${isMine ? 'border-white/40' : 'border-accent'}`}>
              <p className={`text-[11px] font-medium ${isMine ? 'text-white/70' : 'text-accent'}`}>{message.replyTo.senderName}</p>
              <p className={`text-[11px] truncate ${isMine ? 'text-white/50' : 'text-gray-400'}`}>{message.replyTo.text || 'Сообщение'}</p>
            </div>
          )}

          {hasAttachments && message.attachments!.map((att, i) => (
            <AttachmentView
              key={i}
              attachment={att}
              isMine={isMine}
              onImageClick={() => isImageFile(att.mimeType) && setLightbox({ src: att.url, fileName: att.fileName })}
            />
          ))}

          {message.text && (
            <p className={`whitespace-pre-wrap break-words ${hasAttachments ? 'px-3.5 pt-1' : ''}`} style={{ fontSize: `${fontSize}px` }}>{message.text}</p>
          )}

          <div className={`flex items-center justify-end gap-1 mt-0.5 ${hasAttachments && !message.text ? 'px-3.5 pb-2' : ''} ${isMine ? 'text-white/50' : 'text-gray-500'}`}>
            {message.editedAt && <span className="text-[9px] italic">ред.</span>}
            <span className="text-[10px]">{time}</span>
            {statusIcon()}
          </div>
        </div>
        </div>

        {/* Reaction bar on hover */}
        {showReactionBar && onReact && (
          <div className={`absolute ${isMine ? 'right-8' : 'left-8'} -top-8 flex gap-0.5 bg-dark-700 border border-dark-500 rounded-full px-1.5 py-0.5 shadow-lg z-10`}>
            {REACTION_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={(e) => { e.stopPropagation(); onReact(message, emoji); }}
                className="w-7 h-7 flex items-center justify-center text-sm hover:scale-125 transition-transform rounded-full hover:bg-dark-500"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {isMine && myAvatarUrl && showAvatar && (
          <img src={myAvatarUrl} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
        )}
      </div>

      {/* Reaction badges */}
      {message.reactions && message.reactions.length > 0 && (
        <div className={`flex gap-1 mt-0.5 ${isMine ? 'justify-end pr-9' : 'justify-start pl-9'}`}>
          {Object.entries(
            message.reactions.reduce((acc, r) => {
              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)
          ).map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => onReact?.(message, emoji)}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                message.reactions?.some(r => r.emoji === emoji && r.userId === userId)
                  ? 'bg-accent/20 border-accent/50 text-accent'
                  : 'bg-dark-600 border-dark-500 text-gray-300 hover:bg-dark-500'
              }`}
            >
              <span>{emoji}</span>
              {count > 1 && <span>{count}</span>}
            </button>
          ))}
        </div>
      )}

      {contextMenu && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={getContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}

      {lightbox && (
        <ImageLightbox
          src={lightbox.src}
          fileName={lightbox.fileName}
          onClose={() => setLightbox(null)}
          onForward={onForward ? () => { setLightbox(null); onForward(message); } : undefined}
          onDelete={onDelete ? () => { setLightbox(null); onDelete(message); } : undefined}
        />
      )}
    </>
  );
}

function AttachmentView({ attachment, isMine, onImageClick }: { attachment: Attachment; isMine: boolean; onImageClick: () => void }) {
  if (attachment.mimeType?.startsWith('audio/')) {
    return <VoicePlayer url={attachment.url} isMine={isMine} />;
  }

  if (isImageFile(attachment.mimeType)) {
    return (
      <div onClick={onImageClick} className="cursor-pointer">
        <img src={attachment.url} alt={attachment.fileName} className="max-w-full max-h-[300px] object-cover" loading="lazy" />
      </div>
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
