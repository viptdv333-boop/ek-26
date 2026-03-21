import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { usersApi } from '../../services/api/endpoints';
import { useAuthStore } from '../../stores/authStore';

export function ProfileSetupScreen() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Ошибка', 'Введите имя');
      return;
    }

    setLoading(true);
    try {
      await usersApi.updateProfile({ displayName: name.trim() });
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore.getState().setUser({ ...currentUser, displayName: name.trim() });
      }
      // RootNavigator will handle navigation to MainTabs
    } catch (err: any) {
      Alert.alert('Ошибка', err.message || 'Не удалось сохранить профиль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>👤</Text>
      </View>

      <Text style={styles.title}>Как вас зовут?</Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ваше имя"
        placeholderTextColor="#666"
        autoFocus
        maxLength={64}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Продолжить</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', paddingHorizontal: 32 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#1A1A1A',
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  avatarText: { fontSize: 40 },
  title: { fontSize: 20, fontWeight: '600', color: '#FFF', textAlign: 'center', marginBottom: 24 },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4A9EFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
