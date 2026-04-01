import { useState, useEffect, useRef, useMemo } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { messagesApi, messageActionsApi } from '../services/api/endpoints';
import { useTranslation } from '../i18n';
import { wsTransport } from '../services/transport/WebSocketTransport';
import { MessageBubble } from './MessageBubble';
import { sessionManager, messageCache } from '../services/crypto';
import { uploadFile, isImageFile, isVideoFile } from '../services/api/upload';
import { ForwardDialog } from './ForwardDialog';
import { EmojiPicker } from './EmojiPicker';
import { VoiceRecorder } from './VoiceRecorder';
import { GroupInfoPanel } from './GroupInfoPanel';
import { callManager } from '../services/webrtc/CallManager';
import { conversationsApi } from '../services/api/endpoints';
import { useContactsStore } from '../stores/contactsStore';
import type { Attachment } from '../stores/chatStore';

const EMPTY_ARRAY: string[] = [];

interface Props {
  conversationId: string;
}

export function ChatRoom({ conversationId }: Props) {
  const { t, locale } = useTranslation();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [forwardMsg, setForwardMsg] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyingTo = useChatStore((s) => s.replyingTo);
  const setReplyingTo = useChatStore((s) => s.setReplyingTo);
  const editingMessage = useChatStore((s) => s.editingMessage);
  const setEditingMessage = useChatStore((s) => s.setEditingMessage);
  const editMessage = useChatStore((s) => s.editMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const setPinnedMessages = useChatStore((s) => s.setPinnedMessages);
  const addPinnedMessage = useChatStore((s) => s.addPinnedMessage);
  const removePinnedMessage = useChatStore((s) => s.removePinnedMessage);
  const [pinIndex, setPinIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messages = useChatStore((s) => s.messages[conversationId]) || EMPTY_ARRAY;
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);
  const conversations = useChatStore((s) => s.conversations);
  const typingUsers = useChatStore((s) => s.typingUsers[conversationId]) || EMPTY_ARRAY;
  const isUserOnline = useChatStore((s) => s.isUserOnline);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const userId = useAuthStore((s) => s.user?.id);
  const syncedContacts = useContactsStore((s) => s.syncedContacts);
  const storeContacts = useContactsStore((s) => s.contacts);
  const myAvatarUrl = useAuthStore((s) => s.user?.avatarUrl) || null;

  // Wallpaper support — reactive via storage event
  const [currentWallpaper, setCurrentWallpaper] = useState(() => localStorage.getItem('ek26_wallpaper') || 'default');

  // Font size, bubble style — reactive
  const fontSizeMap = [12, 13, 14, 15, 16, 17, 18, 19, 20, 22];
  const [chatFontSize, setChatFontSize] = useState(() => fontSizeMap[(parseInt(localStorage.getItem('ek26_font_size') || '3') - 1)] || 14);
  const [bubbleShape, setBubbleShape] = useState(() => localStorage.getItem('ek26_bubble_shape') || 'rounded');
  const [bubbleColor, setBubbleColor] = useState(() => localStorage.getItem('ek26_bubble_color') || '#6366f1');
  const [bubbleColorOther, setBubbleColorOther] = useState(() => localStorage.getItem('ek26_bubble_color_other') || '#22222f');
  const [fontColor, setFontColor] = useState(() => localStorage.getItem('ek26_font_color') || '#ffffff');
  const [fontColorOther, setFontColorOther] = useState(() => localStorage.getItem('ek26_font_color_other') || '#e5e7eb');

  useEffect(() => {
    const wallpaperHandler = () => setCurrentWallpaper(localStorage.getItem('ek26_wallpaper') || 'default');
    const fontHandler = () => setChatFontSize(fontSizeMap[(parseInt(localStorage.getItem('ek26_font_size') || '3') - 1)] || 14);
    const bubbleHandler = () => {
      setBubbleShape(localStorage.getItem('ek26_bubble_shape') || 'rounded');
      setBubbleColor(localStorage.getItem('ek26_bubble_color') || '#6366f1');
      setBubbleColorOther(localStorage.getItem('ek26_bubble_color_other') || '#22222f');
      setFontColor(localStorage.getItem('ek26_font_color') || '#ffffff');
      setFontColorOther(localStorage.getItem('ek26_font_color_other') || '#e5e7eb');
    };
    window.addEventListener('wallpaper-changed', wallpaperHandler);
    window.addEventListener('storage', wallpaperHandler);
    window.addEventListener('font-size-changed', fontHandler);
    window.addEventListener('bubble-style-changed', bubbleHandler);
    return () => {
      window.removeEventListener('wallpaper-changed', wallpaperHandler);
      window.removeEventListener('storage', wallpaperHandler);
      window.removeEventListener('font-size-changed', fontHandler);
      window.removeEventListener('bubble-style-changed', bubbleHandler);
    };
  }, []);

  const getWallpaperStyle = (): React.CSSProperties => {
    const wallpaper = currentWallpaper;
    const isLight = document.documentElement.classList.contains('light');

    const presets: Record<string, string> = {
      // Dark premium (3)
      'midnight-aurora': 'radial-gradient(ellipse at 20% 80%, rgba(56,189,248,0.1) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.12) 0%, transparent 50%), linear-gradient(135deg, #0a0a1a 0%, #0f172a 40%, #1e1b4b 100%)',
      'obsidian-glow': 'radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.14) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(251,146,60,0.08) 0%, transparent 50%), linear-gradient(180deg, #0f0f0f 0%, #1a0a0a 50%, #0f0f0f 100%)',
      'deep-ocean': 'radial-gradient(ellipse at 30% 70%, rgba(6,182,212,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 30%, rgba(59,130,246,0.1) 0%, transparent 50%), linear-gradient(160deg, #0a0f1a 0%, #0c1929 40%, #0a1628 100%)',
      // Light premium (3)
      'arctic-frost': 'radial-gradient(ellipse at 30% 20%, rgba(147,197,253,0.35) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(196,181,253,0.25) 0%, transparent 50%), linear-gradient(150deg, #f0f4ff 0%, #f5f3ff 50%, #eff6ff 100%)',
      'rose-quartz': 'radial-gradient(ellipse at 25% 75%, rgba(251,207,232,0.4) 0%, transparent 50%), radial-gradient(ellipse at 75% 25%, rgba(254,205,211,0.3) 0%, transparent 50%), linear-gradient(135deg, #fff5f7 0%, #fef2f2 50%, #fff1f2 100%)',
      'golden-hour': 'radial-gradient(ellipse at 30% 60%, rgba(253,224,71,0.2) 0%, transparent 50%), radial-gradient(ellipse at 70% 30%, rgba(251,146,60,0.15) 0%, transparent 50%), linear-gradient(135deg, #fffbeb 0%, #fef3c7 30%, #fff7ed 100%)',
      // Legacy fallbacks
      'emerald-night': 'radial-gradient(ellipse at 25% 75%, rgba(16,185,129,0.1) 0%, transparent 50%), linear-gradient(145deg, #0a0f0d 0%, #0d1a14 50%, #091210 100%)',
      'cosmic-purple': 'radial-gradient(ellipse at 20% 30%, rgba(168,85,247,0.12) 0%, transparent 50%), linear-gradient(135deg, #0f0a1a 0%, #1a0f2e 40%, #150a24 100%)',
      'carbon-ember': 'radial-gradient(ellipse at 50% 80%, rgba(239,68,68,0.1) 0%, transparent 45%), linear-gradient(170deg, #111111 0%, #1a1010 50%, #0f0f0f 100%)',
      'morning-mist': 'radial-gradient(ellipse at 40% 30%, rgba(167,243,208,0.2) 0%, transparent 50%), linear-gradient(140deg, #f0fdf4 0%, #f0f9ff 50%, #f5f3ff 100%)',
      'dark-blue': 'linear-gradient(135deg, #0a0f1a, #0f1b2d)',
      'dark-green': 'linear-gradient(135deg, #0a0f0d, #0d1f17)',
      'gradient-sunset': 'linear-gradient(135deg, #1a0f2e, #2d1b0f)',
    };

    if (wallpaper === 'default') {
      return {
        background: isLight
          ? 'radial-gradient(ellipse at 30% 20%, rgba(220,38,38,0.06) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(147,197,253,0.12) 0%, transparent 50%), linear-gradient(150deg, #fafafa 0%, #f5f5f0 50%, #faf5f5 100%)'
          : 'radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.1) 0%, transparent 45%), radial-gradient(ellipse at 80% 100%, rgba(220,38,38,0.06) 0%, transparent 45%), linear-gradient(180deg, #0f0f0f 0%, #141010 50%, #0f0f0f 100%)',
      };
    }
    if (presets[wallpaper]) {
      return { background: presets[wallpaper] };
    }
    // Custom URL
    if (wallpaper.startsWith('http') || wallpaper.startsWith('/')) {
      return {
        backgroundImage: `url(${wallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return { backgroundColor: 'var(--color-dark-900)' };
  };

  const conv = conversations.find((c) => c.id === conversationId);

  const getOther = () => {
    if (!conv) return null;
    const other = conv.participants.find((p) => {
      const id = typeof p === 'string' ? p : p.id;
      return id !== userId;
    });
    if (!other || typeof other === 'string') return null;
    return other;
  };

  const getTitle = () => {
    if (conv?.groupMeta?.name) return conv.groupMeta.name;
    const other = getOther();
    if (!other) return t('sidebar.chat');
    const synced = syncedContacts.find(sc => sc.registeredUserId === other.id);
    if (synced?.name) return synced.name;
    const contact = storeContacts.find(c => c.userId === other.id);
    if (contact?.displayName && contact.displayName !== contact.phone) return contact.displayName;
    return other.displayName || t('sidebar.chat');
  };

  const otherUser = getOther();
  const syncedOther = otherUser ? syncedContacts.find(sc => sc.registeredUserId === otherUser.id) : null;
  const otherAvatarUrl = syncedOther?.avatarUrl || otherUser?.avatarUrl || null;

  const formatLastSeen = (lastSeen: string | null): string | null => {
    if (!lastSeen) return null;
    const diff = Date.now() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return t('contacts.justNow');
    if (minutes < 60) return t('contacts.minutesAgo', { n: minutes });
    if (hours < 24) return t('contacts.hoursAgo', { n: hours });
    if (days < 30) return t('contacts.daysAgo', { n: days });
    return t('contacts.longAgo');
  };

  const getSubtitle = () => {
    if (typingUsers.length > 0) return t('chat.typing');
    if (conv?.type === 'ai') return 'AI-помощник с поиском в интернете';
    if (conv?.type === 'group') {
      return t('chat.participants', { count: conv.participants.length });
    }
    const other = conv?.participants.find((p) => {
      const id = typeof p === 'string' ? p : p.id;
      return id !== userId;
    });
    const otherId = other ? (typeof other === 'string' ? other : other.id) : null;
    if (otherId && isUserOnline(otherId)) return t('chat.online');
    // Show last seen from contacts store
    if (otherId) {
      const contact = storeContacts.find(c => c.userId === otherId);
      if (contact?.lastSeen) return formatLastSeen(contact.lastSeen);
    }
    return null;
  };

  const title = getTitle();
  const subtitle = getSubtitle();

  const loadMessages = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await messagesApi.list(conversationId);
      const list = Array.isArray(res) ? res : res.messages ?? [];
      const normalized = await Promise.all(list.map(async (m: any) => {
        let text = m.text;
        const encrypted = m.encrypted || false;
        if (!text && encrypted && m.envelope) {
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
            text = t('chat.oldVersionMessage');
          }
        }
        return {
          id: m.id,
          conversationId: m.conversationId,
          senderId: m.senderId || m.sender?.id || '',
          senderName: m.senderName || m.sender?.displayName || '',
          senderAvatarUrl: m.senderAvatarUrl || m.sender?.avatarUrl || null,
          type: m.type,
          text,
          attachments: m.attachments || [],
          replyToId: m.replyToId || null,
          replyTo: m.replyTo || null,
          forwardedFrom: m.forwardedFrom || null,
          reactions: m.reactions || [],
          encrypted,
          status: m.status,
          createdAt: m.createdAt,
          callData: m.callData || null,
        };
      }));
      const decrypted = normalized.filter(m => m.text || (m.attachments && m.attachments.length > 0) || m.type === 'call');
      setMessages(conversationId, decrypted.reverse());
    } catch {} finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();

    // Reload messages when app returns from background (mobile)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadMessages(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);

    // Load pinned messages
    messageActionsApi.getPins(conversationId).then((res: any) => {
      setPinnedMessages(conversationId, res?.pinned || []);
      setPinIndex(0);
    }).catch(() => {});
  }, [conversationId, setMessages, setPinnedMessages]);

  const scrollToMessageId = useChatStore((s) => s.scrollToMessageId);
  const setScrollToMessage = useChatStore((s) => s.setScrollToMessage);

  useEffect(() => {
    // If we have a target message to scroll to, do that instead of scrolling to bottom
    if (scrollToMessageId) {
      const el = document.getElementById(`msg-${scrollToMessageId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-accent', 'rounded-lg', 'bg-accent/10');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-accent', 'rounded-lg', 'bg-accent/10');
        }, 2000);
        setScrollToMessage(null);
        return;
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (messages.length > 0) {
      const unread = messages.filter(m => m.senderId !== userId && m.status !== 'read');
      for (const m of unread) {
        wsTransport.send('message:read', { messageId: m.id });
      }
    }
  }, [messages, userId, scrollToMessageId]);

  const compressImage = (file: File, maxWidth = 1920, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      // Skip small images or non-compressible formats
      if (file.size < 200 * 1024 || file.type === 'image/gif' || file.type === 'image/svg+xml') {
        resolve(file);
        return;
      }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
          } else {
            resolve(file); // compression didn't help
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  };

  const compressVideo = async (file: File): Promise<File> => {
    // Browser-side video compression is limited; just check size
    // If video is over 15MB after this check, it won't upload (server limit)
    return file;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 15 * 1024 * 1024) {
      alert(t('chat.fileTooLarge'));
      return;
    }

    let processedFile = file;

    // Compress images
    if (isImageFile(file.type)) {
      processedFile = await compressImage(file);
      const url = URL.createObjectURL(processedFile);
      setPreviewUrl(url);
    }

    // Show preview for videos
    if (isVideoFile(file.type)) {
      processedFile = await compressVideo(file);
    }

    setUploading(true);
    try {
      const att = await uploadFile(processedFile);
      setPendingAttachment(att);
    } catch (err: any) {
      alert(err.message || t('chat.uploadError'));
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

    // Handle edit mode
    if (editingMessage) {
      const msgId = editingMessage.messageId;
      setEditingMessage(null);
      try {
        const res = await messageActionsApi.edit(msgId, trimmed);
        editMessage(msgId, res.text, res.editedAt);
      } catch (err) {
        console.error('Edit failed:', err);
      }
      return;
    }

    const currentReplyToId = replyingTo?.conversationId === conversationId ? replyingTo?.messageId : null;
    if (replyingTo) setReplyingTo(null);

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
            wsTransport.send('message:send', { conversationId, type: 'text', encrypted: true, envelope, text: trimmed });
          } else {
            await messagesApi.send(conversationId, { type: 'text', encrypted: true, envelope, text: trimmed } as any);
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
        replyToId: currentReplyToId || undefined,
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

  const handleReply = (msg: any) => {
    setReplyingTo({
      conversationId,
      messageId: msg.id,
      text: msg.text || '',
      senderName: msg.senderName || t('sidebar.user'),
    });
  };

  const handleForward = (msg: any) => {
    setForwardMsg(msg);
  };

  const handleEdit = (msg: any) => {
    setEditingMessage({ messageId: msg.id, text: msg.text || '' });
    setText(msg.text || '');
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setText('');
  };

  const handleDelete = async (msg: any) => {
    if (!confirm(t('chat.deleteConfirm'))) return;
    try {
      await messageActionsApi.delete(msg.id);
      deleteMessage(msg.id);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handlePin = async (msg: any) => {
    try {
      await messageActionsApi.pin(conversationId, msg.id);
      addPinnedMessage(conversationId, { id: msg.id, text: msg.text, senderName: msg.senderName || '' });
      setPinIndex(0);
    } catch (err: any) {
      if (!err.message?.includes('409')) console.error('Pin failed:', err);
    }
  };

  const handleUnpin = async (messageId: string) => {
    try {
      await messageActionsApi.unpin(conversationId, messageId);
      removePinnedMessage(conversationId, messageId);
      setPinIndex(0);
    } catch (err) {
      console.error('Unpin failed:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-dark-900)]">
      {/* Header */}
      <div className="h-14 px-4 md:px-6 flex items-center border-b border-[var(--color-border)] bg-[var(--color-dark-800)]">
        {/* Back button — mobile only */}
        <button
          onClick={() => { setActiveConversation(null); window.dispatchEvent(new Event('sidebar-shown')); }}
          className="md:hidden mr-2 p-1 text-gray-400 hover:text-white"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        {conv?.type === 'ai' ? (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center mr-3">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
        ) : otherAvatarUrl ? (
          <img src={otherAvatarUrl} alt="" className="w-8 h-8 rounded-xl object-cover mr-3" />
        ) : (
          <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center mr-3">
            <span className="text-accent text-sm font-medium">
              {conv?.type === 'group' ? '#' : title[0]?.toUpperCase()}
            </span>
          </div>
        )}
        <div
          className={`flex-1 ${conv?.type === 'group' ? 'cursor-pointer' : ''}`}
          onClick={() => { if (conv?.type === 'group') setShowGroupInfo(true); }}
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-[var(--color-text-primary)]">{title}</h2>
            {conv?.type === 'ai' && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-gradient-to-r from-purple-600 to-blue-500 text-white leading-none">AI</span>
            )}
          </div>
          {subtitle && (
            <span className={`text-xs ${typingUsers.length > 0 ? 'text-accent' : subtitle === t('chat.online') ? 'text-green-400' : 'text-gray-400'}`}>
              {subtitle}
            </span>
          )}
        </div>
        {/* Call buttons */}
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => {
              const other = getOther();
              if (other) callManager.startCall(other.id, other.displayName, other.avatarUrl || null, 'audio');
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-dark-600 transition-colors"
            title={t('chat.audioCall')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
          </button>
          <button
            onClick={() => {
              const other = getOther();
              if (other) callManager.startCall(other.id, other.displayName, other.avatarUrl || null, 'video');
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-dark-600 transition-colors"
            title={t('chat.videoCall')}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a2.25 2.25 0 002.25-2.25V7.5a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Pinned messages — horizontal scroll */}
      {conv?.pinnedMessages && conv.pinnedMessages.length > 0 && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-dark-800)]/80">
          <div className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
            {conv.pinnedMessages.map((pin) => (
              <div
                key={pin.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-dark-700 rounded-lg cursor-pointer hover:bg-dark-600 transition-colors flex-shrink-0 min-w-[180px] max-w-[240px]"
                onClick={() => {
                  const el = document.getElementById(`msg-${pin.id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('ring-2', 'ring-accent', 'rounded-lg', 'bg-accent/10');
                    setTimeout(() => el.classList.remove('ring-2', 'ring-accent', 'rounded-lg', 'bg-accent/10'), 2000);
                  }
                }}
              >
                <svg className="w-3.5 h-3.5 text-accent flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-accent font-medium truncate">{pin.senderName || t('chat.pinned')}</p>
                  <p className="text-[11px] text-gray-300 truncate">{pin.text || t('chat.message')}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleUnpin(pin.id); }}
                  className="text-gray-500 hover:text-white p-0.5 flex-shrink-0"
                  title={t('chat.unpin')}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {loading && (
          <div className="text-center text-gray-500 text-sm py-4">{t('chat.loading')}</div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm py-8">
            {t('chat.noMessages')}
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} id={`msg-${msg.id}`} className="transition-all duration-300">
          {msg.type === 'call' && msg.callData ? (
            <CallReportMessage
              callData={msg.callData}
              isMine={msg.senderId === userId}
              isCaller={msg.callData.callerId === userId}
              createdAt={msg.createdAt}
            />
          ) : (
          <MessageBubble
            message={msg}
            isMine={msg.senderId === userId}
            showSender={conv?.type === 'group'}
            showAvatar={true}
            myAvatarUrl={myAvatarUrl}
            onReply={handleReply}
            onForward={handleForward}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPin={handlePin}
            onReact={(msg, emoji) => {
              messageActionsApi.react(msg.id, emoji).catch(console.error);
            }}
            userId={userId}
            fontSize={chatFontSize}
            bubbleShape={bubbleShape}
            bubbleColor={bubbleColor}
            bubbleColorOther={bubbleColorOther}
            fontColor={fontColor}
            fontColorOther={fontColorOther}
          />
          )}
          </div>
        ))}
        {/* Typing indicator */}
        {typingUsers && typingUsers.length > 0 && (
          <div className="flex items-end gap-2 px-2 pb-2" style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-dark-600)' }}>
              {typingUsers.indexOf('ai-bot') >= 0 ? (
                <span className="text-xs font-bold" style={{ color: '#a78bfa' }}>AI</span>
              ) : (
                <svg className="w-4 h-4 animate-typing-pen" style={{ color: 'var(--color-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
              )}
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm" style={{ backgroundColor: 'var(--color-dark-600)' }}>
              <div className="flex items-center gap-1.5">
                <div className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-text-muted)', animationDelay: '0ms' }} />
                <div className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-text-muted)', animationDelay: '150ms' }} />
                <div className="typing-dot w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--color-text-muted)', animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Edit bar */}
      {editingMessage && (
        <div className="px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-dark-800)] flex items-center gap-3">
          <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-accent">{t('chat.editing')}</p>
            <p className="text-xs text-gray-400 truncate">{editingMessage.text}</p>
          </div>
          <button onClick={handleCancelEdit} className="text-gray-400 hover:text-white p-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Reply bar */}
      {replyingTo && replyingTo.conversationId === conversationId && (
        <div className="px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-dark-800)] flex items-center gap-3">
          <div className="border-l-2 border-accent pl-3 flex-1 min-w-0">
            <p className="text-xs font-medium text-accent">{replyingTo.senderName}</p>
            <p className="text-xs text-gray-400 truncate">{replyingTo.text || t('chat.message')}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-white p-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Attachment preview */}
      {(pendingAttachment || uploading) && (
        <div className="px-4 py-2 border-t border-[var(--color-border)] bg-[var(--color-dark-800)]">
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
                <p className="text-sm text-gray-400">{t('chat.uploadingFile')}</p>
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
      <div className="border-t border-[var(--color-border)] bg-[var(--color-dark-800)]">
        {isRecordingVoice ? (
          <VoiceRecorder
            onSend={(att) => {
              setIsRecordingVoice(false);
              // Send voice message
              const voiceMsg = {
                type: 'voice' as const,
                text: '',
                attachments: [att],
              };
              messagesApi.send(conversationId, voiceMsg as any).then((res: any) => {
                if (res) addMessage(conversationId, res);
              }).catch(console.error);
            }}
            onCancel={() => setIsRecordingVoice(false)}
          />
        ) : (
        <div className="px-3 py-1.5 flex items-end gap-1.5">
          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-dark-600 disabled:opacity-30 transition-colors flex-shrink-0"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Emoji button */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-dark-600 transition-colors"
            >
              <span className="text-xl">😊</span>
            </button>
            {showEmojiPicker && (
              <EmojiPicker
                onSelect={(emoji) => {
                  const ta = textareaRef.current;
                  if (ta) {
                    const start = ta.selectionStart || text.length;
                    const before = text.slice(0, start);
                    const after = text.slice(start);
                    setText(before + emoji + after);
                    setTimeout(() => {
                      ta.focus();
                      ta.selectionStart = ta.selectionEnd = start + emoji.length;
                    }, 0);
                  } else {
                    setText(text + emoji);
                  }
                }}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => { setText(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.messagePlaceholder')}
            rows={1}
            className="flex-1 px-3 py-2 bg-[var(--color-dark-700)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] resize-none focus:outline-none focus:border-accent transition-colors"
            style={{ maxHeight: '120px' }}
          />

          {/* Mic button */}
          <button
            onClick={() => setIsRecordingVoice(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-dark-600 transition-colors flex-shrink-0"
            title={t('chat.voiceMessage')}
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </button>

          {/* Send button — always visible */}
          <button
            onClick={handleSend}
            disabled={uploading || (!text.trim() && !pendingAttachment)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        )}
      </div>

      {forwardMsg && <ForwardDialog message={forwardMsg} onClose={() => setForwardMsg(null)} />}

      {showGroupInfo && conv?.type === 'group' && (
        <GroupInfoPanel
          conversation={conv as any}
          currentUserId={userId || ''}
          onClose={() => setShowGroupInfo(false)}
          onUpdated={async () => {
            try {
              const updated = await conversationsApi.getDetails(conversationId);
              if (updated) {
                const convs = useChatStore.getState().conversations;
                const idx = convs.findIndex((c) => c.id === conversationId);
                if (idx >= 0) {
                  const next = [...convs];
                  next[idx] = { ...next[idx], ...updated };
                  useChatStore.setState({ conversations: next });
                }
              }
            } catch {}
          }}
        />
      )}
    </div>
  );
}

function CallReportMessage({ callData, isMine, isCaller, createdAt }: {
  callData: { callType: string; status: string; duration: number | null; callerId: string };
  isMine: boolean;
  isCaller: boolean;
  createdAt: string;
}) {
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `0:${s.toString().padStart(2, '0')}`;
  };

  const isVideo = callData.callType === 'video';
  const icon = isVideo ? '📹' : '📞';

  let label: string;
  let color: string;
  switch (callData.status) {
    case 'completed':
      label = isCaller ? 'Исходящий звонок' : 'Входящий звонок';
      color = 'text-green-400';
      break;
    case 'missed':
      label = isCaller ? 'Звонок без ответа' : 'Пропущенный звонок';
      color = 'text-red-400';
      break;
    case 'declined':
      label = isCaller ? 'Звонок отклонён' : 'Отклонённый звонок';
      color = 'text-orange-400';
      break;
    case 'no-answer':
      label = isCaller ? 'Нет ответа' : 'Пропущенный звонок';
      color = 'text-red-400';
      break;
    default:
      label = 'Звонок';
      color = 'text-gray-400';
  }

  const time = new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex justify-center my-2">
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-700/60 border border-dark-600">
        <span className="text-lg">{icon}</span>
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${color}`}>
            {label}
            {callData.duration != null && (
              <span className="text-gray-400 font-normal ml-1">({formatDuration(callData.duration)})</span>
            )}
          </span>
          <span className="text-[10px] text-gray-500">{time}</span>
        </div>
      </div>
    </div>
  );
}
