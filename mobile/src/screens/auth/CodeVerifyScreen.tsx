import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { authApi } from '../../services/api/endpoints';
import { useAuthStore } from '../../stores/authStore';

type Props = NativeStackScreenProps<AuthStackParamList, 'CodeVerify'>;

export function CodeVerifyScreen({ route, navigation }: Props) {
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Ошибка', 'Введите 6-значный код');
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.verifyCode(phone, code);
      useAuthStore.getState().login(result.accessToken, result.refreshToken, {
        id: result.user.id,
        phone: result.user.phone,
        displayName: result.user.displayName,
        avatarUrl: result.user.avatarUrl,
      });

      if (result.user.isNewUser) {
        navigation.replace('ProfileSetup');
      }
      // If not new user, RootNavigator will auto-switch to MainTabs
    } catch (err: any) {
      Alert.alert('Ошибка', err.message || 'Неверный код');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await authApi.requestCode(phone);
      setCountdown(60);
      Alert.alert('Готово', 'Код отправлен повторно');
    } catch (err: any) {
      Alert.alert('Ошибка', err.message || 'Не удалось отправить код');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        Код отправлен на {phone}
      </Text>

      <TextInput
        ref={inputRef}
        style={styles.input}
        value={code}
        onChangeText={(text) => {
          setCode(text.replace(/\D/g, ''));
          if (text.replace(/\D/g, '').length === 6) {
            // Auto-submit
          }
        }}
        placeholder="000000"
        placeholderTextColor="#666"
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>Подтвердить</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resend}
        onPress={handleResend}
        disabled={countdown > 0}
      >
        <Text style={[styles.resendText, countdown > 0 && styles.resendDisabled]}>
          {countdown > 0 ? `Отправить повторно (${countdown}с)` : 'Отправить повторно'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', justifyContent: 'center', paddingHorizontal: 32 },
  subtitle: { fontSize: 15, color: '#999', textAlign: 'center', marginBottom: 32 },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    fontSize: 28,
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 8,
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
  resend: { marginTop: 20, alignItems: 'center' },
  resendText: { color: '#4A9EFF', fontSize: 14 },
  resendDisabled: { color: '#666' },
});
