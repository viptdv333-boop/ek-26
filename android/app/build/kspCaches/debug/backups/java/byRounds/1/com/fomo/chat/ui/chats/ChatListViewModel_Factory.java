package com.fomo.chat.ui.chats;

import com.fomo.chat.data.repository.ChatRepository;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@ScopeMetadata
@QualifierMetadata
@DaggerGenerated
@Generated(
    value = "dagger.internal.codegen.ComponentProcessor",
    comments = "https://dagger.dev"
)
@SuppressWarnings({
    "unchecked",
    "rawtypes",
    "KotlinInternal",
    "KotlinInternalInJava",
    "cast",
    "deprecation",
    "nullness:initialization.field.uninitialized"
})
public final class ChatListViewModel_Factory implements Factory<ChatListViewModel> {
  private final Provider<ChatRepository> chatRepositoryProvider;

  public ChatListViewModel_Factory(Provider<ChatRepository> chatRepositoryProvider) {
    this.chatRepositoryProvider = chatRepositoryProvider;
  }

  @Override
  public ChatListViewModel get() {
    return newInstance(chatRepositoryProvider.get());
  }

  public static ChatListViewModel_Factory create(Provider<ChatRepository> chatRepositoryProvider) {
    return new ChatListViewModel_Factory(chatRepositoryProvider);
  }

  public static ChatListViewModel newInstance(ChatRepository chatRepository) {
    return new ChatListViewModel(chatRepository);
  }
}
