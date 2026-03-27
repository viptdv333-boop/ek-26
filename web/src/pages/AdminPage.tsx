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
  const [tab, setTab] = useState<'dashboard' | 'users'>('dashboard');

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
      </div>
    </div>
  );
}
