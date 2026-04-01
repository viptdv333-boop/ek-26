import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';

const BASE = '/api';

async function adminFetch(path: string) {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

interface Stats {
  users: { total: number; online: number; newWeek: number; newMonth: number };
  messages: { total: number; today: number; week: number };
  conversations: { total: number; direct: number; group: number };
  disk: { uploads: string; uploadsBytes: number; db: string; dbBytes: number };
}

interface AdminUser {
  id: string;
  phone: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  lastSeen: string;
  isAdmin: boolean;
  createdAt: string;
  messageCount: number;
  conversationCount: number;
}

interface UserDetail {
  id: string;
  phone: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  status: string;
  lastSeen: string;
  isAdmin: boolean;
  pushTokens: number;
  createdAt: string;
  messageCount: number;
  conversationCount: number;
  fileCount: number;
  totalFileSize: string;
  conversations: Array<{
    id: string;
    type: string;
    name: string | null;
    participantCount: number;
    lastMessageAt: string;
  }>;
}

function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon: string }) {
  return (
    <div className="bg-dark-700 rounded-xl p-4 border border-dark-600">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-lg">{icon}</div>
        <div>
          <div className="text-2xl font-bold text-white">{value}</div>
          <div className="text-xs text-gray-400">{label}</div>
        </div>
      </div>
      {sub && <div className="text-[11px] text-gray-500 mt-2">{sub}</div>}
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'сейчас';
  if (min < 60) return `${min} мин назад`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  const days = Math.floor(hrs / 24);
  return `${days} дн назад`;
}

export function AdminPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'dashboard' | 'users' | 'sms' | 'pwa' | 'ai'>('dashboard');
  // AI settings state
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'disabled'>('disabled');
  const [aiSettings, setAiSettings] = useState({ geminiApiKey: '', geminiModel: 'gemini-2.0-flash', openaiApiKey: '', openaiModel: 'gpt-4o-mini', dailyLimitPerUser: 10, systemPrompt: '', searchEnabled: true });
  const [aiSaving, setAiSaving] = useState(false);
  const loadAiSettings = async () => {
    try {
      const token = localStorage.getItem('ek26_token');
      const res = await fetch('/api/admin/ai', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setAiProvider(data.provider);
        setAiSettings({ geminiApiKey: data.geminiApiKey, geminiModel: data.geminiModel, openaiApiKey: data.openaiApiKey, openaiModel: data.openaiModel, dailyLimitPerUser: data.dailyLimitPerUser, systemPrompt: data.systemPrompt, searchEnabled: data.searchEnabled });
      }
    } catch {}
  };
  const saveAiSettings = async () => {
    setAiSaving(true);
    try {
      const token = localStorage.getItem('ek26_token');
      await fetch('/api/admin/ai', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ provider: aiProvider, ...aiSettings }) });
    } catch {}
    setAiSaving(false);
  };
  // SMS settings state
  const [smsProvider, setSmsProvider] = useState<'numcheck' | 'ucaller' | 'dev'>('dev');
  const [smsKeys, setSmsKeys] = useState({ numcheckToken: '', ucallerServiceId: '', ucallerSecretKey: '', alibabaAccessKeyId: '', alibabaAccessKeySecret: '', alibabaSignName: '', alibabaTemplateCode: '' });
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsTestPhone, setSmsTestPhone] = useState('');
  const [smsTestResult, setSmsTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }
    loadData();
  }, [user]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([
        adminFetch('/admin/stats'),
        adminFetch('/admin/users'),
      ]);
      setStats(s);
      setUsers(u);
    } catch (err) {
      console.error('Admin load failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSmsSettings = useCallback(async () => {
    try {
      const data = await adminFetch('/admin/sms');
      setSmsProvider(data.activeProvider);
      setSmsKeys({
        numcheckToken: data.numcheckToken || '',
        ucallerServiceId: data.ucallerServiceId || '',
        ucallerSecretKey: data.ucallerSecretKey || '',
        alibabaAccessKeyId: data.alibabaAccessKeyId || '',
        alibabaAccessKeySecret: data.alibabaAccessKeySecret || '',
        alibabaSignName: data.alibabaSignName || '',
        alibabaTemplateCode: data.alibabaTemplateCode || '',
      });
    } catch (err) {
      console.error('SMS settings load failed:', err);
    }
  }, []);

  const saveSmsSettings = async () => {
    setSmsSaving(true);
    try {
      const token = useAuthStore.getState().token;
      const body: any = { activeProvider: smsProvider };
      // Only send keys that were changed (not masked)
      if (!smsKeys.numcheckToken.startsWith('***')) body.numcheckToken = smsKeys.numcheckToken;
      if (!smsKeys.ucallerSecretKey.startsWith('***')) body.ucallerSecretKey = smsKeys.ucallerSecretKey;
      body.ucallerServiceId = smsKeys.ucallerServiceId;
      body.alibabaAccessKeyId = smsKeys.alibabaAccessKeyId;
      if (!smsKeys.alibabaAccessKeySecret.startsWith('***')) body.alibabaAccessKeySecret = smsKeys.alibabaAccessKeySecret;
      body.alibabaSignName = smsKeys.alibabaSignName;
      body.alibabaTemplateCode = smsKeys.alibabaTemplateCode;

      await fetch(`${BASE}/admin/sms`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setSmsTestResult('Saved!');
      setTimeout(() => setSmsTestResult(null), 2000);
    } catch (err) {
      setSmsTestResult('Save failed');
    } finally {
      setSmsSaving(false);
    }
  };

  const testSms = async () => {
    if (!smsTestPhone) return;
    setSmsTestResult('Sending...');
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch(`${BASE}/admin/sms/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: smsTestPhone }),
      });
      const data = await res.json();
      if (res.ok) {
        setSmsTestResult(`Code: ${data.code} sent to ${smsTestPhone}`);
      } else {
        setSmsTestResult(`Error: ${data.error}`);
      }
    } catch {
      setSmsTestResult('Test failed');
    }
  };

  const loadUserDetail = async (id: string) => {
    try {
      const detail = await adminFetch(`/admin/users/${id}`);
      setSelectedUser(detail);
    } catch (err) {
      console.error('User detail failed:', err);
    }
  };

  const toggleAdmin = async (id: string, current: boolean) => {
    const token = useAuthStore.getState().token;
    await fetch(`${BASE}/admin/users/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAdmin: !current }),
    });
    loadData();
    if (selectedUser?.id === id) loadUserDetail(id);
  };

  const filteredUsers = search
    ? users.filter(u =>
        u.displayName.toLowerCase().includes(search.toLowerCase()) ||
        (u.phone || '').includes(search) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase())
      )
    : users;

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      {/* Header */}
      <div className="border-b border-dark-600 bg-dark-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">Admin Panel</h1>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${tab === 'dashboard' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'}`}
            >Dashboard</button>
            <button
              onClick={() => setTab('users')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${tab === 'users' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'}`}
            >Users</button>
            <button
              onClick={() => { setTab('sms'); loadSmsSettings(); }}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${tab === 'sms' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'}`}
            >SMS</button>
            <button
              onClick={() => setTab('pwa')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${tab === 'pwa' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'}`}
            >PWA</button>
            <button
              onClick={() => { setTab('ai'); loadAiSettings(); }}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${tab === 'ai' ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'}`}
            >AI</button>
          </div>
          <button onClick={loadData} className="text-gray-400 hover:text-white text-sm">Refresh</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'dashboard' && stats && (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard icon="👥" label="Users" value={stats.users.total} sub={`${stats.users.online} online, +${stats.users.newWeek} this week`} />
              <StatCard icon="💬" label="Messages" value={stats.messages.total.toLocaleString()} sub={`${stats.messages.today} today, ${stats.messages.week} this week`} />
              <StatCard icon="📂" label="Conversations" value={stats.conversations.total} sub={`${stats.conversations.direct} direct, ${stats.conversations.group} groups`} />
              <StatCard icon="💾" label="Disk" value={stats.disk.uploads} sub={`DB: ${stats.disk.db}`} />
            </div>

            {/* Recent users preview */}
            <h3 className="text-sm font-medium text-gray-400 mb-3">Recent Users</h3>
            <div className="bg-dark-700 rounded-xl border border-dark-600 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-600 text-gray-400 text-xs">
                    <th className="text-left px-4 py-2">User</th>
                    <th className="text-left px-4 py-2 hidden md:table-cell">Phone</th>
                    <th className="text-left px-4 py-2 hidden md:table-cell">Registered</th>
                    <th className="text-left px-4 py-2">Last seen</th>
                    <th className="text-right px-4 py-2">Msgs</th>
                  </tr>
                </thead>
                <tbody>
                  {users.slice(0, 10).map(u => (
                    <tr key={u.id} className="border-b border-dark-600/50 hover:bg-dark-600/30 cursor-pointer" onClick={() => { setTab('users'); loadUserDetail(u.id); }}>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-medium">
                              {u.displayName?.[0]?.toUpperCase() || '?'}
                            </div>
                          )}
                          <span className="text-white">{u.displayName || 'No name'}</span>
                          {u.isAdmin && <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded">admin</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-gray-400 hidden md:table-cell">{u.phone || '-'}</td>
                      <td className="px-4 py-2 text-gray-400 hidden md:table-cell">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-2 text-gray-400">{timeAgo(u.lastSeen)}</td>
                      <td className="px-4 py-2 text-gray-400 text-right">{u.messageCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'users' && (
          <div className="flex gap-6">
            {/* Users list */}
            <div className={`${selectedUser ? 'w-1/2' : 'w-full'} transition-all`}>
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 mb-4 outline-none focus:border-accent"
              />

              <div className="bg-dark-700 rounded-xl border border-dark-600 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-600 text-gray-400 text-xs">
                      <th className="text-left px-4 py-2">User</th>
                      <th className="text-left px-4 py-2 hidden md:table-cell">Phone</th>
                      <th className="text-left px-4 py-2 hidden md:table-cell">Registered</th>
                      <th className="text-left px-4 py-2">Last seen</th>
                      <th className="text-right px-4 py-2">Msgs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr
                        key={u.id}
                        className={`border-b border-dark-600/50 hover:bg-dark-600/30 cursor-pointer ${selectedUser?.id === u.id ? 'bg-dark-600/50' : ''}`}
                        onClick={() => loadUserDetail(u.id)}
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xs font-medium">
                                {u.displayName?.[0]?.toUpperCase() || '?'}
                              </div>
                            )}
                            <span className="text-white">{u.displayName || 'No name'}</span>
                            {u.isAdmin && <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded">admin</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-gray-400 hidden md:table-cell">{u.phone || '-'}</td>
                        <td className="px-4 py-2 text-gray-400 hidden md:table-cell">{formatDate(u.createdAt)}</td>
                        <td className="px-4 py-2 text-gray-400">{timeAgo(u.lastSeen)}</td>
                        <td className="px-4 py-2 text-gray-400 text-right">{u.messageCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* User detail */}
            {selectedUser && (
              <div className="w-1/2 bg-dark-700 rounded-xl border border-dark-600 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {selectedUser.avatarUrl ? (
                      <img src={selectedUser.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent text-xl font-medium">
                        {selectedUser.displayName?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold">{selectedUser.displayName}</h3>
                      <p className="text-sm text-gray-400">{selectedUser.phone}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-dark-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Messages</div>
                    <div className="text-lg font-bold">{selectedUser.messageCount}</div>
                  </div>
                  <div className="bg-dark-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Conversations</div>
                    <div className="text-lg font-bold">{selectedUser.conversationCount}</div>
                  </div>
                  <div className="bg-dark-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Files</div>
                    <div className="text-lg font-bold">{selectedUser.fileCount}</div>
                    <div className="text-[11px] text-gray-500">{selectedUser.totalFileSize}</div>
                  </div>
                  <div className="bg-dark-800 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Push tokens</div>
                    <div className="text-lg font-bold">{selectedUser.pushTokens}</div>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{selectedUser.email || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Status</span><span>{selectedUser.status || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Registered</span><span>{formatDateTime(selectedUser.createdAt)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Last seen</span><span>{timeAgo(selectedUser.lastSeen)}</span></div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => toggleAdmin(selectedUser.id, selectedUser.isAdmin)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${selectedUser.isAdmin ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' : 'bg-accent/20 text-accent hover:bg-accent/30'}`}
                  >
                    {selectedUser.isAdmin ? 'Remove admin' : 'Make admin'}
                  </button>
                </div>

                {/* Conversations */}
                {selectedUser.conversations.length > 0 && (
                  <>
                    <h4 className="text-xs text-gray-500 mt-4 mb-2">Conversations ({selectedUser.conversations.length})</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {selectedUser.conversations.map(c => (
                        <div key={c.id} className="flex justify-between text-xs bg-dark-800 rounded px-2 py-1.5">
                          <span className="text-gray-300">{c.name || (c.type === 'direct' ? 'Direct' : 'Group')} ({c.participantCount})</span>
                          <span className="text-gray-500">{timeAgo(c.lastMessageAt)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
        {tab === 'sms' && (
          <div className="max-w-xl">
            <h3 className="text-sm font-medium text-gray-400 mb-4">SMS Provider</h3>

            {/* Provider selection */}
            <div className="space-y-3 mb-6">
              {[
                { id: 'numcheck' as const, name: 'NumCheck', desc: 'Flash-call verification' },
                { id: 'ucaller' as const, name: 'uCaller', desc: 'Flash-call verification' },
                { id: 'alibaba' as const, name: 'Alibaba Cloud SMS', desc: 'SMS, works in China' },
                { id: 'twilio' as const, name: 'Twilio', desc: 'SMS, global coverage (200+ countries)' },
                { id: 'dev' as const, name: 'Dev Mode', desc: 'Code: 1945, no real sending' },
              ].map(p => (
                <div
                  key={p.id}
                  onClick={() => setSmsProvider(p.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                    smsProvider === p.id
                      ? 'border-accent bg-accent/10'
                      : 'border-dark-600 bg-dark-700 hover:border-dark-500'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    smsProvider === p.id ? 'border-accent' : 'border-gray-500'
                  }`}>
                    {smsProvider === p.id && <div className="w-2 h-2 rounded-full bg-accent" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Credentials */}
            {smsProvider === 'numcheck' && (
              <div className="space-y-3 mb-6">
                <label className="block">
                  <span className="text-xs text-gray-400">Token</span>
                  <input
                    type="text"
                    value={smsKeys.numcheckToken}
                    onChange={e => setSmsKeys(k => ({ ...k, numcheckToken: e.target.value }))}
                    onFocus={e => { if (e.target.value.startsWith('***')) setSmsKeys(k => ({ ...k, numcheckToken: '' })); }}
                    placeholder="NumCheck API token"
                    className="w-full mt-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
                  />
                </label>
              </div>
            )}

            {smsProvider === 'ucaller' && (
              <div className="space-y-3 mb-6">
                <label className="block">
                  <span className="text-xs text-gray-400">Service ID</span>
                  <input
                    type="text"
                    value={smsKeys.ucallerServiceId}
                    onChange={e => setSmsKeys(k => ({ ...k, ucallerServiceId: e.target.value }))}
                    placeholder="uCaller Service ID"
                    className="w-full mt-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-400">Secret Key</span>
                  <input
                    type="text"
                    value={smsKeys.ucallerSecretKey}
                    onChange={e => setSmsKeys(k => ({ ...k, ucallerSecretKey: e.target.value }))}
                    onFocus={e => { if (e.target.value.startsWith('***')) setSmsKeys(k => ({ ...k, ucallerSecretKey: '' })); }}
                    placeholder="uCaller Secret Key"
                    className="w-full mt-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
                  />
                </label>
              </div>
            )}

            {smsProvider === 'alibaba' && (
              <div className="space-y-3 mb-6">
                <label className="block">
                  <span className="text-xs text-gray-400">AccessKey ID</span>
                  <input
                    type="text"
                    value={smsKeys.alibabaAccessKeyId}
                    onChange={e => setSmsKeys(k => ({ ...k, alibabaAccessKeyId: e.target.value }))}
                    placeholder="LTAI5t..."
                    className="w-full mt-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-400">AccessKey Secret</span>
                  <input
                    type="text"
                    value={smsKeys.alibabaAccessKeySecret}
                    onChange={e => setSmsKeys(k => ({ ...k, alibabaAccessKeySecret: e.target.value }))}
                    onFocus={e => { if (e.target.value.startsWith('***')) setSmsKeys(k => ({ ...k, alibabaAccessKeySecret: '' })); }}
                    placeholder="AccessKey Secret"
                    className="w-full mt-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-400">Sign Name (подпись SMS)</span>
                  <input
                    type="text"
                    value={smsKeys.alibabaSignName}
                    onChange={e => setSmsKeys(k => ({ ...k, alibabaSignName: e.target.value }))}
                    placeholder="FOMO"
                    className="w-full mt-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-400">Template Code (код шаблона)</span>
                  <input
                    type="text"
                    value={smsKeys.alibabaTemplateCode}
                    onChange={e => setSmsKeys(k => ({ ...k, alibabaTemplateCode: e.target.value }))}
                    placeholder="SMS_123456"
                    className="w-full mt-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
                  />
                </label>
              </div>
            )}

            {smsProvider === 'twilio' && (
              <div className="space-y-3 mb-6">
                <label className="block">
                  <span className="text-xs text-gray-400">Account SID</span>
                  <input
                    type="text"
                    value={smsKeys.twilioAccountSid || ''}
                    onChange={e => setSmsKeys(k => ({ ...k, twilioAccountSid: e.target.value }))}
                    placeholder="AC..."
                    className="w-full mt-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-400">Auth Token</span>
                  <input
                    type="text"
                    value={smsKeys.twilioAuthToken || ''}
                    onChange={e => setSmsKeys(k => ({ ...k, twilioAuthToken: e.target.value }))}
                    onFocus={e => { if (e.target.value.startsWith('***')) setSmsKeys(k => ({ ...k, twilioAuthToken: '' })); }}
                    placeholder="Auth Token"
                    className="w-full mt-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-400">Verify Service SID</span>
                  <input
                    type="text"
                    value={smsKeys.twilioVerifyServiceSid || ''}
                    onChange={e => setSmsKeys(k => ({ ...k, twilioVerifyServiceSid: e.target.value }))}
                    placeholder="VA..."
                    className="w-full mt-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
                  />
                </label>
              </div>
            )}

            {smsProvider === 'dev' && (
              <div className="bg-dark-700 border border-dark-600 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-400">Code is always <span className="text-white font-mono font-bold">1945</span>. No real calls/SMS sent.</p>
              </div>
            )}

            {/* Save button */}
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={saveSmsSettings}
                disabled={smsSaving}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
              >
                {smsSaving ? 'Saving...' : 'Save'}
              </button>
              {smsTestResult && (
                <span className="text-sm text-gray-400">{smsTestResult}</span>
              )}
            </div>

            {/* Test */}
            <h3 className="text-sm font-medium text-gray-400 mb-3">Test</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={smsTestPhone}
                onChange={e => setSmsTestPhone(e.target.value)}
                placeholder="+79119279270"
                className="flex-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
              />
              <button
                onClick={testSms}
                className="px-4 py-2 bg-dark-700 hover:bg-dark-600 border border-dark-600 text-white text-sm rounded-lg transition-colors"
              >
                Send test
              </button>
            </div>
          </div>
        )}

        {tab === 'ai' && (
          <div className="bg-dark-800 rounded-xl p-6 max-w-lg space-y-4">
            <h3 className="text-white font-semibold">AI Assistant</h3>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Provider</label>
              <div className="flex gap-2">
                {(['gemini', 'openai', 'disabled'] as const).map(p => (
                  <button key={p} onClick={() => setAiProvider(p)} className={`px-3 py-1.5 rounded-lg text-sm ${aiProvider === p ? 'bg-accent text-white' : 'bg-dark-700 text-gray-400'}`}>
                    {p === 'gemini' ? 'Gemini' : p === 'openai' ? 'OpenAI' : 'Disabled'}
                  </button>
                ))}
              </div>
            </div>

            {aiProvider === 'gemini' && (
              <>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Gemini API Key</label>
                  <input value={aiSettings.geminiApiKey} onChange={e => setAiSettings({...aiSettings, geminiApiKey: e.target.value})} placeholder="AIzaSy..." className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Model</label>
                  <select value={aiSettings.geminiModel} onChange={e => setAiSettings({...aiSettings, geminiModel: e.target.value})} className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent">
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (fast, free)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (legacy)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">Google Search</label>
                  <button onClick={() => setAiSettings({...aiSettings, searchEnabled: !aiSettings.searchEnabled})} className={`w-10 h-6 rounded-full transition-colors ${aiSettings.searchEnabled ? 'bg-accent' : 'bg-dark-600'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${aiSettings.searchEnabled ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              </>
            )}

            {aiProvider === 'openai' && (
              <>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">OpenAI API Key</label>
                  <input value={aiSettings.openaiApiKey} onChange={e => setAiSettings({...aiSettings, openaiApiKey: e.target.value})} placeholder="sk-..." className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Model</label>
                  <select value={aiSettings.openaiModel} onChange={e => setAiSettings({...aiSettings, openaiModel: e.target.value})} className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent">
                    <option value="gpt-4o-mini">GPT-4o Mini (cheap)</option>
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm text-gray-400 mb-1">Daily limit per user</label>
              <input type="number" value={aiSettings.dailyLimitPerUser} onChange={e => setAiSettings({...aiSettings, dailyLimitPerUser: parseInt(e.target.value) || 10})} className="w-24 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent" />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">System prompt</label>
              <textarea value={aiSettings.systemPrompt} onChange={e => setAiSettings({...aiSettings, systemPrompt: e.target.value})} rows={3} className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-accent resize-y" />
            </div>

            <button onClick={saveAiSettings} disabled={aiSaving} className="px-6 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50">
              {aiSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}

        {tab === 'pwa' && (
          <div className="bg-dark-800 rounded-xl p-6 max-w-lg">
            <h3 className="text-white font-semibold mb-4">PWA Icon</h3>
            <p className="text-gray-400 text-sm mb-4">Загрузите квадратное изображение (PNG/JPG). Автоматически создадутся 192×192, 512×512 и favicon.</p>

            <div className="flex items-center gap-4 mb-4">
              <img id="pwa-icon-preview" src={`/api/admin/pwa-icon/icon-192.png?t=${Date.now()}`} alt="Current icon" className="w-16 h-16 rounded-xl border border-dark-600" onError={(e) => { (e.target as HTMLImageElement).src = '/icon-192.png'; }} />
              <span className="text-gray-500 text-xs">Текущая иконка</span>
            </div>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('file', file);
                try {
                  const token = localStorage.getItem('ek26_token');
                  const res = await fetch('/api/admin/pwa-icon', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                  });
                  const data = await res.json();
                  if (res.ok) {
                    // Update preview with cache-busted URL
                    const preview = document.getElementById('pwa-icon-preview') as HTMLImageElement;
                    if (preview) preview.src = `/api/admin/pwa-icon/icon-192.png?t=${Date.now()}`;
                    alert('Иконка обновлена! На телефоне: удалите ярлык → добавьте заново.');
                  } else {
                    alert(data.error || 'Ошибка');
                  }
                } catch { alert('Ошибка загрузки'); }
                e.target.value = '';
              }}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent file:text-white hover:file:bg-accent-hover file:cursor-pointer file:transition-colors"
            />

            <p className="text-gray-500 text-xs mt-4">После обновления на телефоне нужно удалить ярлык и добавить заново (Android кэширует иконку PWA).</p>
          </div>
        )}
      </div>
    </div>
  );
}
