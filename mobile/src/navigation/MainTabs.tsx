import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabsParamList } from './types';
import { ChatStack } from './ChatStack';
import { CallListScreen } from '../screens/calls/CallListScreen';
import { ContactsScreen } from '../screens/contacts/ContactsScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { connectWebSocket, disconnectWebSocket } from '../services/transport/WebSocketTransport';
import { Text } from 'react-native';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  useEffect(() => {
    connectWebSocket();
    return () => disconnectWebSocket();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0A0A',
          borderTopColor: '#1A1A1A',
        },
        tabBarActiveTintColor: '#4A9EFF',
        tabBarInactiveTintColor: '#666666',
      }}
    >
      <Tab.Screen
        name="ChatsTab"
        component={ChatStack}
        options={{
          title: 'Чаты',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💬</Text>,
        }}
      />
      <Tab.Screen
        name="CallsTab"
        component={CallListScreen}
        options={{
          title: 'Звонки',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📞</Text>,
        }}
      />
      <Tab.Screen
        name="ContactsTab"
        component={ContactsScreen}
        options={{
          title: 'Контакты',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Настройки',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
