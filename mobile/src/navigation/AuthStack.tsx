import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import { PhoneInputScreen } from '../screens/auth/PhoneInputScreen';
import { CodeVerifyScreen } from '../screens/auth/CodeVerifyScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0A0A0A' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: '#0A0A0A' },
      }}
    >
      <Stack.Screen
        name="PhoneInput"
        component={PhoneInputScreen}
        options={{ title: 'ЭК-26' }}
      />
      <Stack.Screen
        name="CodeVerify"
        component={CodeVerifyScreen}
        options={{ title: 'Код подтверждения' }}
      />
      <Stack.Screen
        name="ProfileSetup"
        component={ProfileSetupScreen}
        options={{ title: 'Ваш профиль' }}
      />
    </Stack.Navigator>
  );
}
