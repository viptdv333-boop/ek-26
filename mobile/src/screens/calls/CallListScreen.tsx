import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function CallListScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Звонки</Text>
      <Text style={styles.subtitle}>Скоро — аудиозвонки через WebRTC</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFF', fontSize: 20, fontWeight: '600' },
  subtitle: { color: '#666', fontSize: 14, marginTop: 8 },
});
