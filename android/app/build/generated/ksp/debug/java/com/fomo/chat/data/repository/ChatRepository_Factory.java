package com.fomo.chat.data.repository;

import com.fomo.chat.data.local.crypto.TokenManager;
import com.fomo.chat.data.local.db.dao.ConversationDao;
import com.fomo.chat.data.local.db.dao.MessageDao;
import com.fomo.chat.data.remote.api.ConversationsApi;
import com.fomo.chat.data.remote.api.MessagesApi;
import com.fomo.chat.data.remote.api.UploadApi;
import com.google.gson.Gson;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.QualifierMetadata;
import dagger.internal.ScopeMetadata;
import javax.annotation.processing.Generated;
import javax.inject.Provider;

@ScopeMetadata("javax.inject.Singleton")
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
public final class ChatRepository_Factory implements Factory<ChatRepository> {
  private final Provider<ConversationsApi> conversationsApiProvider;

  private final Provider<MessagesApi> messagesApiProvider;

  private final Provider<UploadApi> uploadApiProvider;

  private final Provider<ConversationDao> conversationDaoProvider;

  private final Provider<MessageDao> messageDaoProvider;

  private final Provider<Gson> gsonProvider;

  private final Provider<TokenManager> tokenManagerProvider;

  public ChatRepository_Factory(Provider<ConversationsApi> conversationsApiProvider,
      Provider<MessagesApi> messagesApiProvider, Provider<UploadApi> uploadApiProvider,
      Provider<ConversationDao> conversationDaoProvider, Provider<MessageDao> messageDaoProvider,
      Provider<Gson> gsonProvider, Provider<TokenManager> tokenManagerProvider) {
    this.conversationsApiProvider = conversationsApiProvider;
    this.messagesApiProvider = messagesApiProvider;
    this.uploadApiProvider = uploadApiProvider;
    this.conversationDaoProvider = conversationDaoProvider;
    this.messageDaoProvider = messageDaoProvider;
    this.gsonProvider = gsonProvider;
    this.tokenManagerProvider = tokenManagerProvider;
  }

  @Override
  public ChatRepository get() {
    return newInstance(conversationsApiProvider.get(), messagesApiProvider.get(), uploadApiProvider.get(), conversationDaoProvider.get(), messageDaoProvider.get(), gsonProvider.get(), tokenManagerProvider.get());
  }

  public static ChatRepository_Factory create(Provider<ConversationsApi> conversationsApiProvider,
      Provider<MessagesApi> messagesApiProvider, Provider<UploadApi> uploadApiProvider,
      Provider<ConversationDao> conversationDaoProvider, Provider<MessageDao> messageDaoProvider,
      Provider<Gson> gsonProvider, Provider<TokenManager> tokenManagerProvider) {
    return new ChatRepository_Factory(conversationsApiProvider, messagesApiProvider, uploadApiProvider, conversationDaoProvider, messageDaoProvider, gsonProvider, tokenManagerProvider);
  }

  public static ChatRepository newInstance(ConversationsApi conversationsApi,
      MessagesApi messagesApi, UploadApi uploadApi, ConversationDao conversationDao,
      MessageDao messageDao, Gson gson, TokenManager tokenManager) {
    return new ChatRepository(conversationsApi, messagesApi, uploadApi, conversationDao, messageDao, gson, tokenManager);
  }
}
