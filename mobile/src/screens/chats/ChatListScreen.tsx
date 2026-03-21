import React, { useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChatStackParamList } from '../../navigation/types';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { conversationsApi } from '../../services/api/endpoints';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatList'>;

export function ChatListScreen({ navigation }: Props) {
  const conversations = useChatStore((s) => s.conversations);
  const setConversations = useChatStore((s) => s.setConversations);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [refreshing, setRefreshing] = React.useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const data = await conversationsApi.list();
      setConversations(
        data.map((c) => ({
          id: c.id,
          type: c.type as 'direct' | 'group',
          participants: c.participants,
          groupMeta: c.groupMeta ? {
            name: c.groupMeta.name,
            avatarUrl: c.groupMeta.avatarUrl,
            admins: c.groupMeta.admins,
          } : null,
          lastMessage: c.lastMessage,
          unreadCount: 0,
          updatedAt: c.updatedAt,
        }))
      );
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  }, [setConversations]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const getTitle = (item: typeof conversations[0]): string => {
    if (item.type === 'group' && item.groupMeta) {
      return item.groupMeta.name;
    }
    const other = item.participants.find((p) => p.id !== currentUserId);
    return other?.displayName || 'Чат';
  };

  const getInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const renderItem = ({ item }: { item: typeof conversations[0] }) => {
    const title = getTitle(item);
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => navigation.navigate('ChatRoom', { conversationId: item.id, title })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitial(title)}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>{title}</Text>
            {item.lastMessage && (
              <Text style={styles.time}>{formatTime(item.lastMessage.timestamp)}</Text>
            )}
          </View>
          {item.lastMessage && (
            <View style={styles.row}>
              <Text style={styles.preview} numberOfLines={1}>
                {item.type === 'group' ? `${item.lastMessage.senderName}: ` : ''}
                {item.lastMessage.text}
              </Text>
              {item.unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A9EFF" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Нет чатов</Text>
            <Text style={styles.emptySubtext}>Начните новый разговор</Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewChat')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  item: { flexDirection: 'row', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#1A1A1A' },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#2A2A3A', alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#4A9EFF', fontSize: 20, fontWeight: '600' },
  info: { flex: 1, justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { color: '#FFF', fontSize: 16, fontWeight: '600', flex: 1 },
  time: { color: '#666', fontSize: 12, marginLeft: 8 },
  preview: { color: '#999', fontSize: 14, flex: 1, marginTop: 4 },
  badge: {
    backgroundColor: '#4A9EFF', borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 6, marginLeft: 8,
  },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: '#666', fontSize: 14, marginTop: 8 },
  fab: {
    position: 'absolute', bottom: 20, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#4A9EFF',
    alignItems: 'center', justifyContent: 'center',
    elevation: 5,
    shadowColor: '#4A9EFF', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },
  fabText: { color: '#FFF', fontSize: 28, fontWeight: '300', marginTop: -2 },
});
