import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChatStackParamList } from '../../navigation/types';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { messagesApi } from '../../services/api/endpoints';
import { sendMessage, sendTyping, markRead } from '../../services/transport/WebSocketTransport';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatRoom'>;

export function ChatRoomScreen({ route }: Props) {
  const { conversationId } = route.params;
  const [text, setText] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const messages = useChatStore((s) => s.messages[conversationId] || []);
  const setMessages = useChatStore((s) => s.setMessages);
  const prependMessages = useChatStore((s) => s.prependMessages);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const clearUnread = useChatStore((s) => s.clearUnread);
  const typingUsers = useChatStore((s) => s.typingUsers[conversationId] || []);
  const currentUserId = useAuthStore((s) => s.user?.id);

  // Load initial messages
  useEffect(() => {
    setActiveConversation(conversationId);
    clearUnread(conversationId);

    const loadMessages = async () => {
      try {
        const data = await messagesApi.list(conversationId);
        setMessages(conversationId, data.reverse()); // API returns newest first
      } catch (err) {
        console.error('Failed to load messages:', err);
      }
    };
    loadMessages();

    return () => setActiveConversation(null);
  }, [conversationId, setActiveConversation, clearUnread, setMessages]);

  // Mark messages as read
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender.id !== currentUserId) {
        markRead(lastMsg.id);
      }
    }
  }, [messages, currentUserId]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const sent = sendMessage(conversationId, trimmed);
    if (!sent) {
      // Fallback to HTTP
      messagesApi.send(conversationId, trimmed);
    }
    setText('');
    sendTyping(conversationId, false);
  };

  const handleTextChange = (value: string) => {
    setText(value);
    sendTyping(conversationId, value.length > 0);
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = messages[0];
      const data = await messagesApi.list(conversationId, oldest.createdAt);
      if (data.length > 0) {
        prependMessages(conversationId, data.reverse());
      }
    } catch (err) {
      console.error('Failed to load more:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, messages, conversationId, prependMessages]);

  const formatTime = (iso: string): string => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: typeof messages[0] }) => {
    const isMe = item.sender.id === currentUserId;
    return (
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        {!isMe && (
          <Text style={styles.senderName}>{item.sender.displayName}</Text>
        )}
        <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
          {item.text}
        </Text>
        <Text style={[styles.time, isMe && styles.timeMe]}>
          {formatTime(item.createdAt)}
          {isMe && (item.status === 'read' ? ' ✓✓' : item.status === 'delivered' ? ' ✓✓' : ' ✓')}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onEndReachedThreshold={0.1}
        inverted={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {typingUsers.length > 0 && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>печатает...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleTextChange}
          placeholder="Сообщение..."
          placeholderTextColor="#666"
          multiline
          maxLength={4096}
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  messageList: { padding: 12, paddingBottom: 8 },
  bubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 16,
    marginVertical: 2,
  },
  bubbleMe: {
    backgroundColor: '#1A3A5C',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#1A1A1A',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  senderName: { color: '#4A9EFF', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  messageText: { color: '#EEE', fontSize: 15, lineHeight: 20 },
  messageTextMe: { color: '#FFF' },
  time: { color: '#666', fontSize: 11, marginTop: 4, alignSelf: 'flex-end' },
  timeMe: { color: '#8AB4F8' },
  typingContainer: { paddingHorizontal: 16, paddingBottom: 4 },
  typingText: { color: '#4A9EFF', fontSize: 12, fontStyle: 'italic' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    backgroundColor: '#111',
    borderTopWidth: 0.5,
    borderTopColor: '#1A1A1A',
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#FFF',
    maxHeight: 120,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A9EFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendText: { color: '#FFF', fontSize: 18 },
});
