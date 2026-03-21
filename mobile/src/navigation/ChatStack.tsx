import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChatStackParamList } from './types';
import { ChatListScreen } from '../screens/chats/ChatListScreen';
import { ChatRoomScreen } from '../screens/chats/ChatRoomScreen';
import { NewChatScreen } from '../screens/chats/NewChatScreen';

const Stack = createNativeStackNavigator<ChatStackParamList>();

export function ChatStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0A0A0A' },
        headerTintColor: '#FFFFFF',
        contentStyle: { backgroundColor: '#0A0A0A' },
      }}
    >
      <Stack.Screen
        name="ChatList"
        component={ChatListScreen}
        options={{ title: 'ЭК-26' }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
      <Stack.Screen
        name="NewChat"
        component={NewChatScreen}
        options={{ title: 'Новый чат' }}
      />
    </Stack.Navigator>
  );
}
