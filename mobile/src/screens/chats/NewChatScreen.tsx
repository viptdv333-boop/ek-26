import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChatStackParamList } from '../../navigation/types';
import { usersApi, conversationsApi } from '../../services/api/endpoints';

type Props = NativeStackScreenProps<ChatStackParamList, 'NewChat'>;

interface FoundUser {
  id: string;
  phone: string;
  displayName: string;
  avatarUrl: string | null;
}

export function NewChatScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('+');
  const [results, setResults] = useState<FoundUser[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.length < 7) return;

    setLoading(true);
    try {
      const users = await usersApi.lookup([cleaned]);
      setResults(users);
      if (users.length === 0) {
        Alert.alert('Не найдено', 'Пользователь с таким номером не зарегистрирован');
      }
    } catch (err) {
      console.error('Lookup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (user: FoundUser) => {
    try {
      const result = await conversationsApi.createDirect(user.id);
      navigation.replace('ChatRoom', {
        conversationId: result.id,
        title: user.displayName,
      });
    } catch (err) {
      Alert.alert('Ошибка', 'Не удалось создать чат');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Номер телефона"
          placeholderTextColor="#666"
          keyboardType="phone-pad"
          autoFocus
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.searchText}>Найти</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.userItem} onPress={() => handleSelect(item)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{item.displayName}</Text>
              <Text style={styles.userPhone}>{item.phone}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  searchRow: { flexDirection: 'row', padding: 16, gap: 8 },
  input: {
    flex: 1, backgroundColor: '#1A1A1A', borderRadius: 12,
    padding: 14, fontSize: 16, color: '#FFF',
  },
  searchButton: {
    backgroundColor: '#4A9EFF', borderRadius: 12,
    paddingHorizontal: 20, justifyContent: 'center',
  },
  searchText: { color: '#FFF', fontWeight: '600' },
  userItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#1A1A1A',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#2A2A3A', alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#4A9EFF', fontSize: 18, fontWeight: '600' },
  userName: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  userPhone: { color: '#999', fontSize: 13, marginTop: 2 },
});
