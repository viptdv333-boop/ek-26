import { useState, useEffect, useRef, useCallback } from 'react';
import { formatFileSize, isImageFile, isVideoFile } from '../services/api/upload';
import { MessageContextMenu } from './MessageContextMenu';
import { ImageLightbox } from './ImageLightbox';
import { VoicePlayer } from './VoicePlayer';
import { useTranslation } from '../i18n';
import { translateApi } from '../services/api/endpoints';

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
  fontColor?: string;
  fontColorOther?: string;
}

// Global translate cache per session
const translatedCache = new Map<string, string>();

export function MessageBubble(props: Props) {
  const { message, isMine, showSender, showAvatar = true, myAvatarUrl, onReply, onForward, onEdit, onDelete, onPin, onReact, userId } = props;
  const fontSize = props.fontSize ?? 14;
  const bubbleShape = props.bubbleShape ?? 'cloud';
  const bubbleColor = props.bubbleColor ?? '#6366f1';
  const bubbleColorOther = props.bubbleColorOther ?? '#22222f';
  const fontColor = props.fontColor ?? '#ffffff';
  const fontColorOther = props.fontColorOther ?? '#e5e7eb';
  const { t, lang, locale } = useTranslation();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; fileName: string } | null>(null);
  // showReactionBar removed — reactions now in context menu
  const [translatedText, setTranslatedText] = useState<string | null>(() => translatedCache.get(message.id) || null);
  const [translating, setTranslating] = useState(false);
  const REACTION_EMOJIS = ['👍','❤️','😂','😮','😢','🔥','👎','🎉'];

  // Auto-translate incoming messages
  const [autoTranslateOn, setAutoTranslateOn] = useState(() => localStorage.getItem('ek26_auto_translate') === 'true');

  useEffect(() => {
    const handler = () => {
      const next = localStorage.getItem('ek26_auto_translate') === 'true';
      setAutoTranslateOn(next);
      if (!next) setTranslatedText(null);
    };
    window.addEventListener('auto-translate-changed', handler);
    return () => window.removeEventListener('auto-translate-changed', handler);
  }, []);

  useEffect(() => {
    if (isMine || !message.text || translatedText) return;
    if (!autoTranslateOn) return;
    const hasLatin = /[a-zA-Z]/.test(message.text);
    const hasCyrillic = /[\u0400-\u04FF]/.test(message.text);
    const hasChinese = /[\u4E00-\u9FFF]/.test(message.text);
    const isCurrentLangText =
      (lang === 'ru' && hasCyrillic) ||
      (lang === 'en' && hasLatin && !hasCyrillic && !hasChinese) ||
      (lang === 'zh' && hasChinese);
    if (isCurrentLangText) return;
    handleTranslate();
  }, [message.id, autoTranslateOn]);

  const detectLang = (text: string): string => {
    if (/[\u4E00-\u9FFF]/.test(text)) return 'кит.';
    if (/[\u0400-\u04FF]/.test(text)) return 'рус.';
    if (/[a-zA-Z]/.test(text)) return 'англ.';
    return '';
  };

  const handleTranslate = async () => {
    if (!message.text) return;
    if (translatedCache.has(message.id)) {
      setTranslatedText(translatedCache.get(message.id)!);
      return;
    }
    setTranslating(true);
    try {
      const sourceLang = detectLang(message.text);
      const res = await translateApi.translate(message.text, lang);
      const translated = (res as any).translated || message.text;
      const withLang = sourceLang ? `${translated} (${sourceLang})` : translated;
      translatedCache.set(message.id, withLang);
      setTranslatedText(withLang);
    } catch {
      // silently fail
    } finally {
      setTranslating(false);
    }
  };

  const time = new Date(message.createdAt).toLocaleTimeString(locale, {
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
  const isMediaOnly = hasAttachments && !message.text &&
    message.attachments!.every(a => isImageFile(a.mimeType) || isVideoFile(a.mimeType));
  const avatarUrl = isMine ? myAvatarUrl : message.senderAvatarUrl;

  const handleContextMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if ('clientX' in e) {
      setContextMenu({ x: e.clientX, y: e.clientY });
    } else if (e.touches?.length) {
      setContextMenu({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  // Long-press for touch devices
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    longPressRef.current = setTimeout(() => {
      handleContextMenu(e);
    }, 500);
  };
  const handleTouchEnd = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  };

  const getContextMenuItems = () => {
    const items = [];
    if (onReply) items.push({ label: t('menu.reply'), icon: 'reply', onClick: () => onReply(message) });
    if (onForward) items.push({ label: t('menu.forward'), icon: 'forward', onClick: () => onForward(message) });
    if (isMine && onEdit && message.text) items.push({ label: t('menu.edit'), icon: 'edit', onClick: () => onEdit(message) });
    if (onPin) items.push({ label: t('menu.pin'), icon: 'pin', onClick: () => onPin(message) });
    if (message.text && !isMine) items.push({ label: t('menu.translate'), icon: 'forward', onClick: () => handleTranslate() });
    if (onDelete) items.push({ label: t('menu.delete'), icon: 'delete', onClick: () => onDelete(message), danger: true });
    return items;
  };

  const renderAvatar = () => {
    if (!showAvatar) return <div className="w-7 flex-shrink-0" />;
    if (avatarUrl) return <img src={avatarUrl} alt="" className="w-7 h-7 rounded-xl object-cover flex-shrink-0" />;
    if (!isMine) {
      return (
        <div className="w-7 h-7 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
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
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
      >
        {!isMine && renderAvatar()}

        <div className="max-w-[70%] relative" style={{ color: isMine ? fontColor : fontColorOther }}>
          {/* SVG cloud background (skip for media-only messages) */}
          {bubbleShape === 'cloud' && !isMediaOnly && (
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 200 120"
              preserveAspectRatio="none"
              style={{ zIndex: 0 }}
            >
              <path d={isMine
                ? "M 35,10 C 60,-4 145,-4 172,8 C 198,20 202,42 196,58 C 202,76 192,89 172,91 L 158,91 Q 170,105 174,114 Q 155,100 145,93 C 115,96 50,96 25,87 C 2,76 -2,50 6,30 C 12,14 24,12 35,10 Z"
                : "M 28,10 C 55,-4 140,-4 165,8 C 198,20 202,50 194,70 C 200,83 192,89 175,91 L 55,93 Q 45,100 26,114 Q 30,105 42,91 L 28,91 C 8,89 -2,76 4,58 C -2,42 2,20 28,10 Z"
              } fill={isMine ? bubbleColor : bubbleColorOther} />
            </svg>
          )}
          <div
            className="relative px-3 py-2 overflow-hidden"
            style={bubbleShape === 'cloud' && !isMediaOnly ? {
              zIndex: 1,
              padding: '14px 22px 24px 22px',
            } : isMediaOnly ? {
              borderRadius: '10px',
              overflow: 'hidden',
            } : {
              backgroundColor: isMine ? bubbleColor : bubbleColorOther,
              borderRadius: bubbleShape === 'square' ? '2px' : '10px',
            }}
          >
            {/* Tail for non-cloud (skip for media-only) */}
            {bubbleShape !== 'cloud' && !isMediaOnly && (
              <div
                className="absolute bottom-0"
                style={{
                  [isMine ? 'right' : 'left']: '-6px',
                  width: 0, height: 0,
                  borderStyle: 'solid',
                  borderWidth: isMine ? '0 0 12px 12px' : '0 12px 12px 0',
                  borderColor: isMine
                    ? `transparent transparent ${bubbleColor} transparent`
                    : `transparent transparent ${bubbleColorOther} transparent`,
                }}
              />
            )}
          {showSender && !isMine && message.senderName && (
            <p className="text-xs font-medium text-accent mb-0.5">{message.senderName}</p>
          )}

          {message.forwardedFrom && (
            <div className="text-[11px] mb-1" style={{ color: isMine ? fontColor + '99' : fontColorOther + '99' }}>
              {t('message.forwardedFrom', { name: message.forwardedFrom.originalSenderName })}
            </div>
          )}

          {message.replyTo && (
            <div className="border-l-2 pl-2 mb-1.5 py-0.5" style={{ borderColor: isMine ? fontColor + '66' : 'var(--color-accent, #ef4444)' }}>
              <p className={`text-[11px] font-medium ${isMine ? '' : 'text-accent'}`} style={isMine ? { color: fontColor + 'B3' } : undefined}>{message.replyTo.senderName}</p>
              <p className="text-[11px] truncate" style={{ color: isMine ? fontColor + '80' : fontColorOther + '80' }}>{message.replyTo.text || t('message.message')}</p>
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

          {/* Translated text */}
          {translatedText && (
            <div className={`mt-1 ${hasAttachments ? 'px-3.5' : ''}`}>
              <p className="whitespace-pre-wrap break-words italic" style={{ fontSize: `${Math.max(fontSize - 2, 11)}px`, color: isMine ? fontColor + 'B3' : fontColorOther + 'B3' }}>{translatedText}</p>
              <button
                onClick={(e) => { e.stopPropagation(); setTranslatedText(null); translatedCache.delete(message.id); }}
                className="text-[10px] mt-0.5 transition-colors cursor-pointer"
                style={{ color: isMine ? fontColor + '66' : fontColorOther + '66' }}
              >
                {t('translate.hide')}
              </button>
            </div>
          )}
          {translating && (
            <p className="text-[10px] mt-0.5 italic" style={{ color: isMine ? fontColor + '66' : fontColorOther + '66' }}>...</p>
          )}

          <div className={`flex items-center justify-end gap-1 mt-0.5 ${hasAttachments && !message.text ? 'px-3.5 pb-2' : ''}`}
               style={{ color: isMine ? fontColor + '80' : fontColorOther + '80', fontSize: `${Math.max(Math.round(fontSize / 2), 8)}px` }}>
            {message.editedAt && <span className="italic">{t('message.edited')}</span>}
            <span>{time}</span>
            {statusIcon()}
          </div>
        </div>
        </div>
        {/* Reaction bar removed — reactions now in context menu */}

        {isMine && myAvatarUrl && showAvatar && (
          <img src={myAvatarUrl} alt="" className="w-7 h-7 rounded-xl object-cover flex-shrink-0" />
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
                  : 'bg-[var(--color-dark-600)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-dark-500)]'
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
          reactions={onReact ? REACTION_EMOJIS : undefined}
          onReact={onReact ? (emoji) => onReact(message, emoji) : undefined}
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
        <p className="text-[11px]" style={{ color: isMine ? fontColor + '80' : fontColorOther + '80' }}>{formatFileSize(attachment.size)}</p>
      </div>
    </a>
  );
}
