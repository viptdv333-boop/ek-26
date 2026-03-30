import { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore, Conversation } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { conversationsApi, searchApi, chatActionsApi } from '../services/api/endpoints';
import { NewChatDialog } from './NewChatDialog';
import { PhoneLinkDialog } from './PhoneLinkDialog';
import { ProfileModal } from './ProfileModal';
import { AppSettingsModal } from './AppSettingsModal';
import { ContactsPanel } from './ContactsPanel';
import { useContactsStore } from '../stores/contactsStore';
import { MessageContextMenu } from './MessageContextMenu';
import { useTranslation } from '../i18n';
import { wsTransport } from '../services/transport/WebSocketTransport';

function WeatherWidget() {
  const [weather, setWeather] = useState<{ temp: string; icon: string; desc: string; city: string } | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch('https://wttr.in/?format=j1');
        const data = await res.json();
        const current = data.current_condition?.[0];
        const city = data.nearest_area?.[0]?.areaName?.[0]?.value || '';
        if (current) {
          const temp = current.temp_C;
          const code = parseInt(current.weatherCode);
          const desc = current.lang_ru?.[0]?.value || current.weatherDesc?.[0]?.value || '';
          let icon = '☀️';
          if (code >= 200 && code < 300) icon = '⛈️';
          else if (code >= 300 && code < 400) icon = '🌧️';
          else if (code >= 400 && code < 600) icon = '🌧️';
          else if (code >= 600 && code < 700) icon = '❄️';
          else if (code >= 700 && code < 800) icon = '🌫️';
          else if (code === 113) icon = '☀️';
          else if (code === 116) icon = '⛅';
          else if (code === 119 || code === 122) icon = '☁️';
          else if (code >= 176) icon = '🌧️';
          setWeather({ temp: `${temp}°`, icon, desc, city });
        }
      } catch {}
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!weather) return <span className="text-sm text-gray-400">...</span>;

  return (
    <div className="flex items-center gap-1.5 text-sm" title={`${weather.city}: ${weather.desc}`}>
      <span>{weather.icon}</span>
      <span className="text-[var(--color-text-primary)] font-medium">{weather.temp}</span>
      <span className="text-gray-400 text-xs truncate max-w-[100px]">{weather.city}</span>
    </div>
  );
}

// ── Quotes database (localized) ──────────────────────────────────
const QUOTES_RU = [
  { t: 'Единственный способ делать великую работу — любить то, что делаешь.', a: 'Стив Джобс' },
  { t: 'Будь собой, остальные роли уже заняты.', a: 'Оскар Уайльд' },
  { t: 'Успех — это способность идти от неудачи к неудаче не теряя энтузиазма.', a: 'У. Черчилль' },
  { t: 'Не бойся идти медленно, бойся стоять на месте.', a: 'Китайская мудрость' },
  { t: 'Будущее принадлежит тем, кто верит в красоту своей мечты.', a: 'Э. Рузвельт' },
  { t: 'Каждый день — это маленькая жизнь.', a: 'А. Шопенгауэр' },
  { t: 'Простота — это высшая утончённость.', a: 'Леонардо да Винчи' },
  { t: 'Действие — это основной ключ к успеху.', a: 'Пабло Пикассо' },
  { t: 'Жизнь — это то, что случается с тобой, пока ты строишь другие планы.', a: 'Дж. Леннон' },
  { t: 'Лучшее время посадить дерево было 20 лет назад. Второе лучшее — сейчас.', a: '' },
  { t: 'Стремитесь не к успеху, а к ценностям, которые он даёт.', a: 'А. Эйнштейн' },
  { t: 'Делай то, что можешь, с тем, что имеешь, там, где находишься.', a: 'Т. Рузвельт' },
  { t: 'Воображение важнее знания.', a: 'А. Эйнштейн' },
  { t: 'Величайшая слава не в том, чтобы никогда не падать, а в том, чтобы подниматься каждый раз.', a: 'Конфуций' },
  { t: 'Познай самого себя.', a: 'Сократ' },
  { t: 'Счастье зависит от нас самих.', a: 'Аристотель' },
  { t: 'В середине каждой трудности кроется возможность.', a: 'А. Эйнштейн' },
  { t: 'Дорога в тысячу ли начинается с первого шага.', a: 'Лао-цзы' },
  { t: 'Знание — сила.', a: 'Ф. Бэкон' },
  { t: 'Думай иначе.', a: 'Стив Джобс' },
  { t: 'Будь изменением, которое хочешь видеть в мире.', a: 'М. Ганди' },
  { t: 'Талант выигрывает игры, а командная работа — чемпионаты.', a: 'М. Джордан' },
  { t: 'Верь, что можешь — и ты уже на полпути.', a: 'Т. Рузвельт' },
];

const QUOTES_EN = [
  { t: 'The only way to do great work is to love what you do.', a: 'Steve Jobs' },
  { t: 'Be yourself; everyone else is already taken.', a: 'Oscar Wilde' },
  { t: 'Success is walking from failure to failure with no loss of enthusiasm.', a: 'W. Churchill' },
  { t: 'Do not fear going slowly, fear standing still.', a: 'Chinese proverb' },
  { t: 'The future belongs to those who believe in the beauty of their dreams.', a: 'E. Roosevelt' },
  { t: 'Simplicity is the ultimate sophistication.', a: 'Leonardo da Vinci' },
  { t: 'Action is the foundational key to all success.', a: 'Pablo Picasso' },
  { t: 'Life is what happens when you\'re busy making other plans.', a: 'J. Lennon' },
  { t: 'The best time to plant a tree was 20 years ago. The second best time is now.', a: '' },
  { t: 'Imagination is more important than knowledge.', a: 'A. Einstein' },
  { t: 'Our greatest glory is not in never falling, but in rising every time we fall.', a: 'Confucius' },
  { t: 'Know thyself.', a: 'Socrates' },
  { t: 'Happiness depends upon ourselves.', a: 'Aristotle' },
  { t: 'In the middle of every difficulty lies opportunity.', a: 'A. Einstein' },
  { t: 'A journey of a thousand miles begins with a single step.', a: 'Lao Tzu' },
  { t: 'Knowledge is power.', a: 'F. Bacon' },
  { t: 'Think different.', a: 'Steve Jobs' },
  { t: 'Be the change you wish to see in the world.', a: 'M. Gandhi' },
  { t: 'Talent wins games, but teamwork wins championships.', a: 'M. Jordan' },
  { t: 'Believe you can and you\'re halfway there.', a: 'T. Roosevelt' },
];

const QUOTES_ZH = [
  { t: '\u505A\u4F1F\u5927\u5DE5\u4F5C\u7684\u552F\u4E00\u65B9\u6CD5\u662F\u70ED\u7231\u4F60\u6240\u505A\u7684\u4E8B\u3002', a: '\u4E54\u5E03\u65AF' },
  { t: '\u505A\u4F60\u81EA\u5DF1\uFF0C\u56E0\u4E3A\u522B\u4EBA\u90FD\u6709\u4EBA\u505A\u4E86\u3002', a: '\u738B\u5C14\u5FB7' },
  { t: '\u4E0D\u8981\u6015\u8D70\u5F97\u6162\uFF0C\u53EA\u6015\u4F60\u505C\u4E0B\u6765\u3002', a: '\u4E2D\u56FD\u8C1A\u8BED' },
  { t: '\u672A\u6765\u5C5E\u4E8E\u90A3\u4E9B\u76F8\u4FE1\u68A6\u60F3\u4E4B\u7F8E\u7684\u4EBA\u3002', a: '\u7F57\u65AF\u798F' },
  { t: '\u7B80\u5355\u662F\u7EC8\u6781\u7684\u7CBE\u81F4\u3002', a: '\u8FBE\u82AC\u5947' },
  { t: '\u884C\u52A8\u662F\u6210\u529F\u7684\u57FA\u7840\u3002', a: '\u6BD5\u52A0\u7D22' },
  { t: '\u751F\u6D3B\u5C31\u662F\u5F53\u4F60\u5FD9\u4E8E\u5236\u5B9A\u5176\u4ED6\u8BA1\u5212\u65F6\u6240\u53D1\u751F\u7684\u4E8B\u3002', a: '\u5217\u4FAC' },
  { t: '\u79CD\u4E00\u68F5\u6811\u6700\u597D\u7684\u65F6\u95F4\u662F\u4E8C\u5341\u5E74\u524D\uFF0C\u5176\u6B21\u662F\u73B0\u5728\u3002', a: '' },
  { t: '\u60F3\u8C61\u529B\u6BD4\u77E5\u8BC6\u66F4\u91CD\u8981\u3002', a: '\u7231\u56E0\u65AF\u5766' },
  { t: '\u6700\u5927\u7684\u5149\u8363\u4E0D\u662F\u6C38\u4E0D\u8DCC\u5012\uFF0C\u800C\u662F\u6BCF\u6B21\u8DCC\u5012\u540E\u90FD\u80FD\u7AD9\u8D77\u6765\u3002', a: '\u5B54\u5B50' },
  { t: '\u8BA4\u8BC6\u4F60\u81EA\u5DF1\u3002', a: '\u82CF\u683C\u62C9\u5E95' },
  { t: '\u5E78\u798F\u53D6\u51B3\u4E8E\u6211\u4EEC\u81EA\u5DF1\u3002', a: '\u4E9A\u91CC\u58EB\u591A\u5FB7' },
  { t: '\u5343\u91CC\u4E4B\u884C\uFF0C\u59CB\u4E8E\u8DB3\u4E0B\u3002', a: '\u8001\u5B50' },
  { t: '\u77E5\u8BC6\u5C31\u662F\u529B\u91CF\u3002', a: '\u57F9\u6839' },
  { t: '\u4E0D\u540C\u51E1\u60F3\u3002', a: '\u4E54\u5E03\u65AF' },
  { t: '\u6210\u4E3A\u4F60\u5E0C\u671B\u770B\u5230\u7684\u4E16\u754C\u7684\u6539\u53D8\u3002', a: '\u7518\u5730' },
  { t: '\u5929\u624D\u8D62\u5F97\u6BD4\u8D5B\uFF0C\u56E2\u961F\u8D62\u5F97\u51A0\u519B\u3002', a: '\u4E54\u4E39' },
  { t: '\u76F8\u4FE1\u4F60\u80FD\uFF0C\u4F60\u5C31\u5DF2\u7ECF\u6210\u529F\u4E86\u4E00\u534A\u3002', a: '\u7F57\u65AF\u798F' },
];

const QUOTES: Record<string, Array<{ t: string; a: string }>> = {
  ru: QUOTES_RU,
  en: QUOTES_EN,
  zh: QUOTES_ZH,
};

function QuoteWidget() {
  const lang = (localStorage.getItem('ek26_lang') || 'ru') as 'ru' | 'en' | 'zh';
  const list = QUOTES[lang] || QUOTES_RU;
  const [quote, setQuote] = useState<{ t: string; a: string }>(
    () => list[Math.floor(Math.random() * list.length)]
  );
  const [key, setKey] = useState(0); // force re-render for animation restart

  useEffect(() => {
    const handler = () => {
      const curLang = (localStorage.getItem('ek26_lang') || 'ru') as 'ru' | 'en' | 'zh';
      const curList = QUOTES[curLang] || QUOTES_RU;
      setQuote(curList[Math.floor(Math.random() * curList.length)]);
      setKey(k => k + 1);
    };
    window.addEventListener('sidebar-shown', handler);
    return () => window.removeEventListener('sidebar-shown', handler);
  }, []);

  const fullText = quote.a ? `${quote.t} — ${quote.a}` : quote.t;
  const duration = Math.max(10, fullText.length * 0.18);

  return (
    <div className="flex-1 overflow-hidden relative h-5 min-w-0" title={fullText}>
      <div
        key={key}
        className="absolute whitespace-nowrap text-xs text-gray-300 italic leading-5"
        style={{ animation: `marquee ${duration}s linear infinite` }}
      >
        <span className="text-accent mr-1.5">💬</span>
        {fullText}
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}

function RemindersWidget() {
  const [reminders, setReminders] = useState<{ id: string; text: string; time: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newText, setNewText] = useState('');
  const [newTime, setNewTime] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('ek26_reminders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Filter out expired reminders (keep if within last hour or future)
        const now = Date.now() - 3600000;
        setReminders(parsed.filter((r: any) => new Date(r.time).getTime() > now));
      } catch {}
    }
  }, []);

  const saveReminders = (list: typeof reminders) => {
    setReminders(list);
    localStorage.setItem('ek26_reminders', JSON.stringify(list));
  };

  const addReminder = () => {
    if (!newText.trim() || !newTime) return;
    const r = { id: Date.now().toString(), text: newText.trim(), time: newTime };
    saveReminders([...reminders, r].sort((a, b) => a.time.localeCompare(b.time)));
    setNewText('');
    setNewTime('');
    setShowAdd(false);
  };

  const removeReminder = (id: string) => {
    saveReminders(reminders.filter(r => r.id !== id));
  };

  // Check for due reminders
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      reminders.forEach(r => {
        const rTime = new Date(r.time);
        if (Math.abs(rTime.getTime() - now.getTime()) < 60000) {
          if (Notification.permission === 'granted') {
            new Notification('FOMO Напоминание', { body: r.text });
          }
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [reminders]);

  const nextReminder = reminders.find(r => new Date(r.time) > new Date());

  return (
    <div className="relative">
      <button
        onClick={() => setShowAdd(!showAdd)}
        className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-[var(--color-text-primary)] transition-colors"
        title={nextReminder ? `${nextReminder.text} — ${new Date(nextReminder.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Добавить напоминание'}
      >
        <span className="text-accent">🔔</span>
        {nextReminder ? (
          <span className="truncate max-w-[160px]">
            {new Date(nextReminder.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {nextReminder.text}
          </span>
        ) : (
          <span className="text-gray-500">+</span>
        )}
      </button>
      {showAdd && (
        <div className="absolute top-8 left-0 w-64 bg-dark-700 border border-dark-500 rounded-xl shadow-xl z-50 p-3 space-y-2">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-[var(--color-text-primary)]">Напоминания</span>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-[var(--color-text-primary)] text-xs">✕</button>
          </div>
          {reminders.map(r => (
            <div key={r.id} className="flex items-center gap-2 text-xs">
              <span className="text-gray-400">{new Date(r.time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span className="text-[var(--color-text-primary)] flex-1 truncate">{r.text}</span>
              <button onClick={() => removeReminder(r.id)} className="text-red-400 hover:text-red-300">✕</button>
            </div>
          ))}
          <div className="flex gap-1.5 pt-1">
            <input
              type="text"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="Текст..."
              className="flex-1 px-2 py-1.5 bg-dark-600 border border-dark-500 rounded-lg text-xs text-[var(--color-text-primary)] placeholder-gray-500 focus:outline-none focus:border-accent"
              onKeyDown={e => e.key === 'Enter' && addReminder()}
            />
            <input
              type="datetime-local"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              className="px-1.5 py-1.5 bg-dark-600 border border-dark-500 rounded-lg text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-accent w-[130px]"
            />
          </div>
          <button
            onClick={addReminder}
            disabled={!newText.trim() || !newTime}
            className="w-full py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg disabled:opacity-40 transition-colors"
          >
            Добавить
          </button>
        </div>
      )}
    </div>
  );
}

function HeaderWidget() {
  const [widget, setWidget] = useState(() => localStorage.getItem('ek26_header_widget') || 'weather');

  useEffect(() => {
    const handler = () => setWidget(localStorage.getItem('ek26_header_widget') || 'weather');
    window.addEventListener('widget-changed', handler);
    return () => window.removeEventListener('widget-changed', handler);
  }, []);

  switch (widget) {
    case 'weather': return <WeatherWidget />;
    case 'quote': return <QuoteWidget />;
    case 'reminders': return <RemindersWidget />;
    case 'none': return null;
    default: return <WeatherWidget />;
  }
}

interface SearchResult {
  messageId: string;
  conversationId: string;
  conversationName: string;
  text: string;
  senderName: string;
  createdAt: string;
}

export function Sidebar() {
  const { t, locale } = useTranslation();
  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const user = useAuthStore((s) => s.user);
  const authLogout = useAuthStore((s) => s.logout);
  const resetChat = useChatStore((s) => s.reset);
  const contacts = useContactsStore((s) => s.contacts);
  const syncedContacts = useContactsStore((s) => s.syncedContacts);
  const addContact = useContactsStore((s) => s.addContact);
  const fetchContacts = useContactsStore((s) => s.fetchContacts);
  const fetchSyncedContacts = useContactsStore((s) => s.fetchSyncedContacts);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showPhoneLink, setShowPhoneLink] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAppSettings, setShowAppSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');
  const [showContacts, setShowContacts] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [chatMenu, setChatMenu] = useState<{ x: number; y: number; convId: string } | null>(null);
  const setConversations = useChatStore((s) => s.setConversations);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showArchive, setShowArchive] = useState(false);
  const [connStatus, setConnStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');

  // Listen for events from EmptyState quick actions
  useEffect(() => {
    const onNewChat = () => setShowNewChat(true);
    const onContacts = () => setShowContacts(true);
    const onAppSettings = () => setShowAppSettings(true);
    window.addEventListener('open-new-chat', onNewChat);
    window.addEventListener('open-contacts', onContacts);
    window.addEventListener('open-app-settings', onAppSettings);
    return () => {
      window.removeEventListener('open-new-chat', onNewChat);
      window.removeEventListener('open-contacts', onContacts);
      window.removeEventListener('open-app-settings', onAppSettings);
    };
  }, []);

  useEffect(() => {
    const unsub = wsTransport.on('connection', (data: { status: string }) => {
      setConnStatus(data.status as any);
    });
    // Check initial state
    setConnStatus(wsTransport.connected ? 'connected' : 'connecting');
    return unsub;
  }, []);

  // Load contacts and synced contacts for name display
  useEffect(() => {
    if (contacts.length === 0) fetchContacts();
    if (syncedContacts.length === 0) fetchSyncedContacts();
  }, []);

  const doSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await searchApi.messages(query.trim());
      const results = (res as any)?.results || res || [];
      setSearchResults(Array.isArray(results) ? results : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (!val.trim()) {
      setSearchResults(null);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      return;
    }
    // Debounce 500ms
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doSearch(val), 500);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      doSearch(search);
    }
  };

  const handleChatContextMenu = (e: React.MouseEvent, convId: string) => {
    e.preventDefault();
    setChatMenu({ x: e.clientX, y: e.clientY, convId });
  };

  const longPressTriggered = useRef(false);

  const handleTouchStart = (convId: string, e: React.TouchEvent) => {
    longPressTriggered.current = false;
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setChatMenu({ x: touch.clientX, y: touch.clientY, convId });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    // Cancel long press if user scrolls
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePinChat = async (convId: string) => {
    setChatMenu(null);
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const isPinned = (conv as any).isPinned;
    // Update locally
    const updated = conversations.map(c =>
      c.id === convId ? { ...c, isPinned: !isPinned, updatedAt: isPinned ? c.updatedAt : new Date().toISOString() } as any : c
    );
    setConversations(updated);
  };

  const handleMuteChat = async (convId: string) => {
    setChatMenu(null);
    try {
      const res = await chatActionsApi.mute(convId);
      const muted = (res as any).muted;
      const updated = conversations.map(c =>
        c.id === convId ? { ...c, isMuted: muted } as any : c
      );
      setConversations(updated);
    } catch (err) {
      console.error('Mute failed:', err);
    }
  };

  const handleArchiveChat = async (convId: string) => {
    setChatMenu(null);
    try {
      const res = await chatActionsApi.archive(convId);
      const archived = (res as any).archived;
      const updated = conversations.map(c =>
        c.id === convId ? { ...c, isArchived: archived } as any : c
      );
      setConversations(updated);
    } catch (err) {
      console.error('Archive failed:', err);
    }
  };

  const handleBlockUser = async (convId: string) => {
    setChatMenu(null);
    const conv = conversations.find(c => c.id === convId);
    if (!conv || conv.type !== 'direct') return;
    const otherId = getOtherUserId(conv);
    if (!otherId) return;
    await new Promise(r => setTimeout(r, 100));
    if (!window.confirm(t('confirm.blockUser'))) return;
    try {
      await chatActionsApi.block(otherId);
    } catch (err) {
      console.error('Block failed:', err);
    }
  };

  const handleLeaveGroup = async (convId: string) => {
    setChatMenu(null);
    await new Promise(r => setTimeout(r, 100));
    if (!window.confirm(t('confirm.leaveGroup'))) return;
    try {
      const userId = useAuthStore.getState().user?.id;
      if (userId) {
        await conversationsApi.removeMember(convId, userId);
        const updated = conversations.filter(c => c.id !== convId);
        setConversations(updated);
        if (activeId === convId) setActive(null);
      }
    } catch (err) {
      console.error('Leave group failed:', err);
    }
  };

  const handleDeleteChat = async (convId: string) => {
    setChatMenu(null);
    // Small delay to let menu close before confirm dialog
    await new Promise(r => setTimeout(r, 100));
    if (!window.confirm(t('confirm.deleteChat'))) return;
    try {
      await conversationsApi.delete(convId);
      const updated = conversations.filter(c => c.id !== convId);
      setConversations(updated);
      if (activeId === convId) setActive(null);
    } catch (err) {
      console.error('Delete chat failed:', err);
    }
  };

  const getConversationName = (conv: Conversation): string => {
    if (conv.groupMeta?.name) return conv.groupMeta.name;
    // Direct chat — find the other participant
    const other = conv.participants.find((p) => {
      const id = typeof p === 'string' ? p : p.id;
      return id !== user?.id;
    });
    if (!other) return t('sidebar.chat');
    if (typeof other === 'string') return t('sidebar.user');
    const otherId = other.id;
    // Priority: synced contact name > regular contact name > participant displayName
    const contact = contacts.find(c => c.userId === otherId);
    const synced = syncedContacts.find(sc => sc.registeredUserId === otherId);
    if (synced?.name) return synced.name;
    if (contact?.displayName && contact.displayName !== contact.phone) return contact.displayName;
    return other.displayName || t('sidebar.user');
  };

  const getOtherUser = (conv: Conversation) => {
    if (conv.type !== 'direct') return null;
    const other = conv.participants.find((p) => {
      const id = typeof p === 'string' ? p : p.id;
      return id !== user?.id;
    });
    if (!other || typeof other === 'string') return null;
    return other;
  };

  const getOtherUserId = (conv: Conversation): string | null => {
    const other = getOtherUser(conv);
    return other?.id || null;
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  const sortedConversations = [...conversations].sort((a, b) => {
    const aPinned = (a as any).isPinned ? 1 : 0;
    const bPinned = (b as any).isPinned ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Separate archived and non-archived
  const activeConversations = sortedConversations.filter(c => !(c as any).isArchived);
  const archivedConversations = sortedConversations.filter(c => (c as any).isArchived);

  // Local name filtering as fallback while typing (before search results arrive)
  const filtered = search && !searchResults
    ? activeConversations.filter((c) => getConversationName(c).toLowerCase().includes(search.toLowerCase()))
    : activeConversations;

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    if (parts.length === 1) return text;
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <span key={i} className="bg-accent/30 text-white font-medium">{part}</span>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="w-full md:w-80 flex-shrink-0 border-r border-[var(--color-border)] flex flex-col" style={{ backgroundColor: 'transparent' }}>
      {/* Header — logo + widget + settings gear */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <img src="/logo-f.png" alt="F" className="h-8 w-8 object-contain shrink-0 rounded-lg" />
          <HeaderWidget />
        </div>
        <button
          onClick={() => setShowAppSettings(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-dark-600)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors flex-shrink-0"
          title={t('sidebar.settingsApp')}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.004.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* User profile - under header like Kimi */}
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-3">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-sm font-medium">{user?.displayName?.[0]?.toUpperCase()}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-[var(--color-text-primary)] truncate block">{user?.displayName || t('sidebar.me')}</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                connStatus === 'connected' ? 'bg-green-500' :
                connStatus === 'disconnected' ? 'bg-red-500' :
                'bg-yellow-500 animate-pulse'
              }`} />
              <span className="text-xs text-[var(--color-text-muted)] truncate">
                {user?.phone || (connStatus === 'connected' ? t('sidebar.online') :
                 connStatus === 'disconnected' ? t('sidebar.offline') :
                 t('sidebar.connecting'))}
              </span>
            </div>
          </div>
          {/* Edit profile pencil */}
          <button
            onClick={() => setShowProfile(true)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[var(--color-dark-600)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            title={t('sidebar.settingsProfile')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 py-2 bg-[var(--color-dark-700)] mx-3 mt-2 rounded-full">
        <button
          className="flex-1 py-2 text-sm font-semibold rounded-full bg-[var(--color-text-primary)] text-[var(--color-dark-800)] shadow-sm"
        >
          {t('sidebar.chats')}
        </button>
        <button
          onClick={() => setShowContacts(true)}
          className="flex-1 py-2 text-sm font-semibold rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-all"
        >
          {t('sidebar.contacts')}
        </button>
      </div>

      <div className="p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={t('sidebar.search')}
          className="w-full px-3 py-2 bg-[var(--color-dark-700)] border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Search results */}
      {searchResults !== null && search.trim() ? (
        <div className="flex-1 overflow-y-auto">
          {searchLoading && (
            <div className="px-4 py-4 text-center text-[var(--color-text-muted)] text-sm">{t('sidebar.searching')}</div>
          )}
          {!searchLoading && searchResults.length === 0 && (
            <div className="px-4 py-8 text-center text-[var(--color-text-muted)] text-sm">{t('sidebar.nothingFound')}</div>
          )}
          {!searchLoading && searchResults.map((result, i) => (
            <button
              key={`${result.messageId}-${i}`}
              onClick={() => {
                useChatStore.getState().setScrollToMessage(result.messageId);
                setActive(result.conversationId);
                setSearch('');
                setSearchResults(null);
              }}
              className="w-full px-4 py-3 flex flex-col gap-1 hover:bg-[var(--color-dark-700)] transition-colors text-left border-b border-[var(--color-border)]"
            >
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-medium text-accent truncate">{result.conversationName || t('sidebar.chat')}</span>
                <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0 ml-2">{formatTime(result.createdAt)}</span>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">{result.senderName || t('sidebar.user')}</p>
              <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">
                {highlightMatch(result.text || '', search)}
              </p>
            </button>
          ))}
        </div>
      ) : (
      <>
      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-[var(--color-text-muted)] text-sm">
            {search ? t('sidebar.nothingFound') : t('sidebar.noChats')}
          </div>
        )}
        {filtered.map((conv) => {
          const isActive = conv.id === activeId;
          const name = getConversationName(conv);
          const otherUserId = getOtherUserId(conv);
          const isOnline = otherUserId ? onlineUsers.has(otherUserId) : false;
          const isGroup = conv.type === 'group';

          const isPinned = (conv as any).isPinned;
          const isMuted = (conv as any).isMuted;
          return (
            <button
              key={conv.id}
              onClick={() => { if (!longPressTriggered.current) setActive(conv.id); }}
              onContextMenu={(e) => handleChatContextMenu(e, conv.id)}
              onTouchStart={(e) => handleTouchStart(conv.id, e)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
              className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-dark-700)] transition-colors text-left ${
                isActive ? 'bg-[var(--color-dark-600)]' : ''
              }`}
            >
              {/* Avatar */}
              <div className="relative w-10 h-10 flex-shrink-0">
                {isGroup && conv.groupMeta?.avatarUrl ? (
                  <img src={conv.groupMeta.avatarUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
                ) : !isGroup && (() => {
                  const ou = getOtherUser(conv);
                  const sc = ou ? syncedContacts.find(s => s.registeredUserId === ou.id) : null;
                  return sc?.avatarUrl || ou?.avatarUrl;
                })() ? (
                  <img src={(() => {
                    const ou = getOtherUser(conv);
                    const sc = ou ? syncedContacts.find(s => s.registeredUserId === ou.id) : null;
                    return sc?.avatarUrl || ou?.avatarUrl || '';
                  })()} alt="" className="w-10 h-10 rounded-xl object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <span className="text-accent text-sm font-medium">
                      {isGroup ? '#' : name[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                {!isGroup && isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--color-dark-800)]" />
                )}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-medium text-[var(--color-text-primary)] truncate flex items-center gap-1">
                    {name}
                    {isMuted && <span className="text-[var(--color-text-muted)] text-xs" title={t('sidebar.mutedNotif')}>🔇</span>}
                  </span>
                  {conv.lastMessage && (
                    <span className="text-xs text-[var(--color-text-muted)] flex-shrink-0 ml-2">
                      {formatTime(conv.lastMessage.createdAt)}
                    </span>
                  )}
                </div>
                {conv.lastMessage && (
                  <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">{conv.lastMessage.text}</p>
                )}
              </div>
              {/* Right side: menu button + pin + unread */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {isPinned && (
                  <svg className="w-3 h-3 text-[var(--color-text-muted)]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                  </svg>
                )}
                {conv.unreadCount > 0 && (
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                    <span className="text-[10px] text-white font-medium">{conv.unreadCount}</span>
                  </div>
                )}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setChatMenu({ x: rect.left, y: rect.bottom, convId: conv.id });
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[var(--color-dark-600)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </div>
              </div>
            </button>
          );
        })}

        {/* Archive section */}
        {archivedConversations.length > 0 && (
          <>
            <button
              onClick={() => setShowArchive(!showArchive)}
              className="w-full px-4 py-2.5 flex items-center gap-2 text-gray-400 hover:text-[var(--color-text-primary)] hover:bg-dark-700 transition-colors text-sm"
            >
              <svg className={`w-4 h-4 transition-transform ${showArchive ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
              {t('sidebar.archive')} ({archivedConversations.length})
            </button>
            {showArchive && archivedConversations.map((conv) => {
              const isActive = conv.id === activeId;
              const name = getConversationName(conv);
              const otherUserId = getOtherUserId(conv);
              const isOnline = otherUserId ? onlineUsers.has(otherUserId) : false;
              const isGroup = conv.type === 'group';
              return (
                <button
                  key={conv.id}
                  onClick={() => { if (!longPressTriggered.current) setActive(conv.id); }}
                  onContextMenu={(e) => handleChatContextMenu(e, conv.id)}
                  onTouchStart={(e) => handleTouchStart(conv.id, e)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                  className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-dark-700 transition-colors text-left opacity-70 ${
                    isActive ? 'bg-dark-600' : ''
                  }`}
                >
                  <div className="relative w-10 h-10 flex-shrink-0">
                    {!isGroup && getOtherUser(conv)?.avatarUrl ? (
                      <img src={getOtherUser(conv)!.avatarUrl!} alt="" className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                        <span className="text-accent text-sm font-medium">
                          {isGroup ? '#' : name[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-[var(--color-text-primary)] truncate block">{name}</span>
                    {conv.lastMessage && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{conv.lastMessage.text}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>

      {/* New chat button */}
      <div className="px-4 py-3 border-t border-[var(--color-border)]">
        <button
          onClick={() => setShowNewChat(true)}
          className="w-full py-3 bg-[var(--color-text-primary)] text-[var(--color-dark-800)] font-semibold rounded-xl transition-colors text-sm hover:opacity-90 flex items-center justify-center gap-2"
        >
          <span className="text-lg leading-none">+</span> {t('sidebar.newChat')}
        </button>
      </div>

      {/* Logout button */}
      <div className="px-4 py-2 border-t border-[var(--color-border)] flex items-center justify-center">
        <button
          onClick={() => { authLogout(); resetChat(); }}
          className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-dark-600)] rounded-lg transition-colors"
          title={t('settings.logout')}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      </div>

      {/* Bottom actions */}
      {user?.isAdmin && (
        <div className="px-4 py-2 border-t border-[var(--color-border)] flex items-center justify-center">
          <a
            href="/admin"
            className="p-2 text-yellow-500/70 hover:text-yellow-500 hover:bg-[var(--color-dark-600)] rounded-lg transition-colors"
            title="Admin Panel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </a>
        </div>
      )}
      </>
      )}

      {/* Contacts modal */}
      {showContacts && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowContacts(false)}>
          <div
            className="w-full max-w-lg bg-[var(--color-dark-800)] rounded-2xl shadow-2xl flex flex-col mx-4"
            style={{ maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{t('contacts.title')}</h2>
              <button onClick={() => setShowContacts(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-dark-600)] text-[var(--color-text-muted)] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {/* Contacts panel content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <ContactsPanel />
            </div>
          </div>
        </div>
      )}

      {showNewChat && <NewChatDialog onClose={() => setShowNewChat(false)} />}
      {showPhoneLink && <PhoneLinkDialog onClose={() => setShowPhoneLink(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showAppSettings && <AppSettingsModal onClose={() => setShowAppSettings(false)} />}

      {chatMenu && (
        <MessageContextMenu
          x={chatMenu.x}
          y={chatMenu.y}
          items={[
            {
              label: (conversations.find(c => c.id === chatMenu.convId) as any)?.isPinned ? t('menu.unpin') : t('menu.pin'),
              icon: 'pin',
              onClick: () => handlePinChat(chatMenu.convId),
            },
            {
              label: (conversations.find(c => c.id === chatMenu.convId) as any)?.isMuted ? t('menu.unmute') : t('menu.mute'),
              icon: 'mute',
              onClick: () => handleMuteChat(chatMenu.convId),
            },
            {
              label: (conversations.find(c => c.id === chatMenu.convId) as any)?.isArchived ? t('menu.unarchive') : t('menu.archive'),
              icon: 'archive',
              onClick: () => handleArchiveChat(chatMenu.convId),
            },
            ...(() => {
              const conv = conversations.find(c => c.id === chatMenu.convId);
              if (conv?.type === 'direct') {
                const otherUserId = getOtherUserId(conv);
                const isContact = otherUserId ? contacts.some(c => c.userId === otherUserId) : true;
                return [
                  ...(!isContact && otherUserId ? [{
                    label: t('menu.addContact'),
                    icon: 'user',
                    onClick: async () => { try { await addContact(otherUserId); showToast(t('contacts.addedToast')); } catch {} setChatMenu(null); },
                  }] : []),
                  {
                    label: t('menu.block'),
                    icon: 'block',
                    onClick: () => handleBlockUser(chatMenu.convId),
                  },
                ];
              }
              return [{
                label: t('menu.leaveGroup'),
                icon: 'delete',
                onClick: () => handleLeaveGroup(chatMenu.convId),
                danger: true,
              }];
            })(),
            {
              label: t('menu.deleteChat'),
              icon: 'delete',
              onClick: () => handleDeleteChat(chatMenu.convId),
              danger: true,
            },
          ]}
          onClose={() => setChatMenu(null)}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 bg-accent text-white text-sm font-medium rounded-xl shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
