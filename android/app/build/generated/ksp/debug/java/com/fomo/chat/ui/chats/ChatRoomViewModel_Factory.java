package com.fomo.chat.ui.chats;

import androidx.lifecycle.SavedStateHandle;
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

  public ChatRoomViewModel_Factory(Provider<SavedStateHandle> savedStateHandleProvider) {
    this.savedStateHandleProvider = savedStateHandleProvider;
  }

  @Override
  public ChatRoomViewModel get() {
    return newInstance(savedStateHandleProvider.get());
  }

  public static ChatRoomViewModel_Factory create(
      Provider<SavedStateHandle> savedStateHandleProvider) {
    return new ChatRoomViewModel_Factory(savedStateHandleProvider);
  }

  public static ChatRoomViewModel newInstance(SavedStateHandle savedStateHandle) {
    return new ChatRoomViewModel(savedStateHandle);
  }
}
