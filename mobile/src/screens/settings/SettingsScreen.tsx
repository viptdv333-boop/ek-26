import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { useTransportStore } from '../../stores/transportStore';
import { disconnectWebSocket } from '../../services/transport/WebSocketTransport';
import { authApi } from '../../services/api/endpoints';

export function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const activeTransport = useTransportStore((s) => s.activeTransport);
  const status = useTransportStore((s) => s.status);

  const handleLogout = () => {
    Alert.alert('Выход', 'Вы уверены?', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: async () => {
          try {
            await authApi.logout();
          } catch {}
          disconnectWebSocket();
          useAuthStore.getState().logout();
        },
      },
    ]);
  };

  const transportLabel: Record<string, string> = {
    ws: '🟢 WebSocket (интернет)',
    push: '🟡 Push-уведомления',
    rss: '🟠 RSS (скрытый канал)',
    mesh: '🔵 Mesh (P2P WiFi)',
  };

  const statusLabel: Record<string, string> = {
    connected: 'Подключено',
    degraded: 'Ограниченное соединение',
    offline: 'Нет связи',
  };

  return (
    <View style={styles.container}>
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.displayName?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{user?.displayName}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Транспорт</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Канал</Text>
          <Text style={styles.value}>{transportLabel[activeTransport]}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Статус</Text>
          <Text style={styles.value}>{statusLabel[status]}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Выйти из аккаунта</Text>
      </TouchableOpacity>

      <Text style={styles.version}>ЭК-26 v0.1.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', padding: 20 },
  profile: { alignItems: 'center', paddingVertical: 30 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#2A2A3A', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#4A9EFF', fontSize: 32, fontWeight: '600' },
  name: { color: '#FFF', fontSize: 22, fontWeight: '700' },
  phone: { color: '#999', fontSize: 14, marginTop: 4 },
  section: {
    backgroundColor: '#111', borderRadius: 12, padding: 16, marginTop: 20,
  },
  sectionTitle: { color: '#4A9EFF', fontSize: 13, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { color: '#999', fontSize: 15 },
  value: { color: '#FFF', fontSize: 15 },
  logoutButton: {
    backgroundColor: '#331111', borderRadius: 12,
    padding: 16, alignItems: 'center', marginTop: 30,
  },
  logoutText: { color: '#FF4444', fontSize: 16, fontWeight: '600' },
  version: { color: '#333', fontSize: 12, textAlign: 'center', marginTop: 30 },
});
