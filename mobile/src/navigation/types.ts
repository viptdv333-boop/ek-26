export type AuthStackParamList = {
  PhoneInput: undefined;
  CodeVerify: { phone: string };
  ProfileSetup: undefined;
};

export type MainTabsParamList = {
  ChatsTab: undefined;
  CallsTab: undefined;
  ContactsTab: undefined;
  SettingsTab: undefined;
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: { conversationId: string; title: string };
  ChatInfo: { conversationId: string };
  NewChat: undefined;
  NewGroup: undefined;
};
