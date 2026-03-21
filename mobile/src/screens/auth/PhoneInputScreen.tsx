import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { authApi } from '../../services/api/endpoints';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneInput'>;

export function PhoneInputScreen({ navigation }: Props) {
  const [phone, setPhone] = useState('+');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const cleaned = phone.replace(/\s/g, '');
    if (!/^\+[1-9]\d{6,14}$/.test(cleaned)) {
      Alert.alert('Ошибка', 'Введите номер в международном формате (например +79001234567)');
      return;
    }

    setLoading(true);
    try {
      await authApi.requestCode(cleaned);
      navigation.navigate('CodeVerify', { phone: cleaned });
    } catch (err: any) {
      Alert.alert('Ошибка', err.message || 'Не удалось отправить код');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Добро пожаловать</Text>
        <Text style={styles.subtitle}>
          Введите номер телефона для входа
        </Text>

        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+7 900 123 45 67"
          placeholderTextColor="#666"
          keyboardType="phone-pad"
          autoFocus
          maxLength={16}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Получить код</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  title: { fontSize: 28, fontWeight: '700', color: '#FFF', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#999', textAlign: 'center', marginBottom: 40 },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 1,
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
