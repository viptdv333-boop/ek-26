package com.fomo.chat.ui.chats;

import androidx.lifecycle.SavedStateHandle;
import com.fomo.chat.data.local.crypto.TokenManager;
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
public final class ChatRoomViewModel_Factory implements Factory<ChatRoomViewModel> {
  private final Provider<SavedStateHandle> savedStateHandleProvider;

  private final Provider<ChatRepository> chatRepositoryProvider;

  private final Provider<TokenManager> tokenManagerProvider;

  public ChatRoomViewModel_Factory(Provider<SavedStateHandle> savedStateHandleProvider,
      Provider<ChatRepository> chatRepositoryProvider,
      Provider<TokenManager> tokenManagerProvider) {
    this.savedStateHandleProvider = savedStateHandleProvider;
    this.chatRepositoryProvider = chatRepositoryProvider;
    this.tokenManagerProvider = tokenManagerProvider;
  }

  @Override
  public ChatRoomViewModel get() {
    return newInstance(savedStateHandleProvider.get(), chatRepositoryProvider.get(), tokenManagerProvider.get());
  }

  public static ChatRoomViewModel_Factory create(
      Provider<SavedStateHandle> savedStateHandleProvider,
      Provider<ChatRepository> chatRepositoryProvider,
      Provider<TokenManager> tokenManagerProvider) {
    return new ChatRoomViewModel_Factory(savedStateHandleProvider, chatRepositoryProvider, tokenManagerProvider);
  }

  public static ChatRoomViewModel newInstance(SavedStateHandle savedStateHandle,
      ChatRepository chatRepository, TokenManager tokenManager) {
    return new ChatRoomViewModel(savedStateHandle, chatRepository, tokenManager);
  }
}
