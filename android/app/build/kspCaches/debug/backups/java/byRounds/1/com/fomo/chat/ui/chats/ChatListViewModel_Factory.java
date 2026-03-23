package com.fomo.chat.ui.chats;

import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;

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
  @Override
  public ChatListViewModel get() {
    return newInstance();
  }

  public static ChatListViewModel_Factory create() {
    return InstanceHolder.INSTANCE;
  }

  public static ChatListViewModel newInstance() {
    return new ChatListViewModel();
  }

  private static final class InstanceHolder {
    private static final ChatListViewModel_Factory INSTANCE = new ChatListViewModel_Factory();
  }
}
