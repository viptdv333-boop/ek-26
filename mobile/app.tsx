import React from 'react';
import { StatusBar } from 'react-native';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
      <RootNavigator />
    </>
  );
}
