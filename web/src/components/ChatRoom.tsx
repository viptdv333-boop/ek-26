import { useState, useEffect, useRef, useMemo } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { messagesApi } from '../services/api/endpoints';
import { wsTransport } from '../services/transport/WebSocketTransport';
import { MessageBubble } from './MessageBubble';
import { sessionManager, messageCache } from '../services/crypto';
import { uploadFile, isImageFile } from '../services/api/upload';
import type { Attachment } from '../stores/chatStore';

const EMPTY_ARRAY: string[] = [];

interface Props {
  conversationId: string;
}

export function ChatRoom({ conversationId }: Props) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messages = useChatStore((s) => s.messages[conversationId]) || EMPTY_ARRAY;
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);
  const conversations = useChatStore((s) => s.conversations);
  const typingUsers = useChatStore((s) => s.typingUsers[conversationId]) || EMPTY_ARRAY;
  const isUserOnline = useChatStore((s) => s.isUserOnline);
  const userId = useAuthStore((s) => s.user?.id);

  const conv = conversations.find((c) => c.id === conversationId);

  const getTitle = () => {
    if (conv?.groupMeta?.name) return conv.groupMeta.name;
    if (!conv) return 'Чат';
    const other = conv.participants.find((p) => {
      const id = typeof p === 'string' ? p : p.id;
      return id !== userId;
    });
    if (!other) return 'Чат';
    return typeof other === 'string' ? 'Пользователь' : other.displayName || 'Пользователь';
  };

  const getSubtitle = () => {
    if (typingUsers.length > 0) return 'печатает...';
    if (conv?.type === 'group') {
      return `${conv.participants.length} участников`;
    }
    const other = conv?.participants.find((p) => {
      const id = typeof p === 'string' ? p : p.id;
      return id !== userId;
    });
    const otherId = other ? (typeof other === 'string' ? other : other.id) : null;
    if (otherId && isUserOnline(otherId)) return 'в сети';
    return null;
  };

  const title = getTitle();
  const subtitle = getSubtitle();

  useEffect(() => {
    setLoading(true);
    messagesApi.list(conversationId).then(async (res) => {
      const list = Array.isArray(res) ? res : res.messages ?? [];
      const normalized = await Promise.all(list.map(async (m: any) => {
        let text = m.text;
        const encrypted = m.encrypted || false;
        if (encrypted && m.envelope) {
          try {
            const cached = await messageCache.get(m.id);
            if (cached) {
              text = cached;
            } else {
              const senderId = m.senderId || m.sender?.id || '';
              text = await sessionManager.decryptMessage(senderId, m.envelope);
              await messageCache.put(m.id, text);
            }
          } catch {
            text = null;
          }
        }
        return {
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId || m.sender?.id || '',
          senderName: m.senderName || m.sender?.displayName || '',
          type: m.type,
          text,
          attachments: m.attachments || [],
          encrypted,
          status: m.status,
          createdAt: m.createdAt,
        };
      }));
      const decrypted = normalized.filter(m => m.text !== null || (m.attachments && m.attachments.length > 0));
      setMessages(conversationId, decrypted.reverse());
    }).catch(() => {}).finally(() => setLoading(false));
  }, [conversationId, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (messages.length > 0) {
      const unread = messages.filter(m => m.senderId !== userId && m.status !== 'read');
      for (const m of unread) {
        wsTransport.send('message:read', { messageId: m.id });
      }
    }
  }, [messages, userId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 15 * 1024 * 1024) {
      alert('Файл слишком большой. Максимум 15 МБ.');
      return;
    }

    // Show preview for images
    if (isImageFile(file.type)) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }

    setUploading(true);
    try {
      const att = await uploadFile(file);
      setPendingAttachment(att);
    } catch (err: any) {
      alert(err.message || 'Ошибка загрузки файла');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const cancelAttachment = () => {
    setPendingAttachment(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed && !pendingAttachment) return;
    setText('');

    const attachments = pendingAttachment ? [pendingAttachment] : [];
    const hasAttachments = attachments.length > 0;

    // Clear attachment state
    if (pendingAttachment) {
      setPendingAttachment(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }

    // Try E2EE for text-only direct chats (attachments sent as plaintext for now)
    let sent = false;

    if (conv?.type === 'direct' && trimmed && !hasAttachments) {
      const other = conv.participants.find((p) => {
        const id = typeof p === 'string' ? p : p.id;
        return id !== userId;
      });
      const recipientId = other ? (typeof other === 'string' ? other : other.id) : null;

      if (recipientId) {
        try {
          const envelope = await sessionManager.encryptMessage(recipientId, trimmed);
          wsTransport.setPendingText(conversationId, trimmed);
          if (wsTransport.connected) {
            wsTransport.send('message:send', { conversationId, type: 'text', encrypted: true, envelope });
          } else {
            await messagesApi.send(conversationId, { type: 'text', encrypted: true, envelope } as any);
          }
          sent = true;
        } catch (err) {
          console.warn('E2EE failed, sending plaintext:', err);
        }
      }
    }

    if (!sent) {
      const msgData: any = {
        conversationId,
        type: hasAttachments ? (isImageFile(attachments[0].mimeType) ? 'image' : 'file') : 'text',
        text: trimmed || undefined,
        attachments: hasAttachments ? attachments : undefined,
      };

      if (wsTransport.connected) {
        wsTransport.send('message:send', msgData);
      } else {
        try {
          const msg = await messagesApi.send(conversationId, msgData);
          addMessage(conversationId, msg);
        } catch (err) {
          console.error('Send error:', err);
          setText(trimmed);
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    wsTransport.send('typing:start', { conversationId });
  };

  return (
    <div className="flex-1 flex flex-col bg-dark-900">
      {/* Header */}
      <div className="h-14 px-6 flex items-center border-b border-dark-600 bg-dark-800">
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center mr-3">
          <span className="text-accent text-sm font-medium">
            {conv?.type === 'group' ? '#' : title[0]?.toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-medium text-white">{title}</h2>
          {subtitle && (
            <span className={`text-xs ${typingUsers.length > 0 ? 'text-accent' : 'text-gray-400'}`}>
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">
        {loading && (
          <div className="text-center text-gray-500 text-sm py-4">Загрузка...</div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">
            Нет сообщений. Напишите первое!
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isMine={msg.senderId === userId}
            showSender={conv?.type === 'group'}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment preview */}
      {(pendingAttachment || uploading) && (
        <div className="px-4 py-2 border-t border-dark-600 bg-dark-800">
          <div className="flex items-center gap-3">
            {previewUrl ? (
              <img src={previewUrl} alt="" className="w-16 h-16 rounded-lg object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-dark-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              {uploading ? (
                <p className="text-sm text-gray-400">Загрузка файла...</p>
              ) : pendingAttachment ? (
                <p className="text-sm text-white truncate">{pendingAttachment.fileName}</p>
              ) : null}
            </div>
            {!uploading && (
              <button onClick={cancelAttachment} className="text-gray-400 hover:text-white p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-dark-600 bg-dark-800">
        <div className="flex items-end gap-2">
          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-white hover:bg-dark-600 disabled:opacity-30 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
            onChange={handleFileSelect}
            className="hidden"
          />

          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение..."
            rows={1}
            className="flex-1 px-4 py-2.5 bg-dark-700 border border-dark-500 rounded-xl text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-accent transition-colors"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={(!text.trim() && !pendingAttachment) || uploading}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
