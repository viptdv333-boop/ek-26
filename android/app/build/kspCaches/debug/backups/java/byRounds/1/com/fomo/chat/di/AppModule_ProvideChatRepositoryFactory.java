package com.fomo.chat.di;

import com.fomo.chat.data.local.db.dao.ConversationDao;
import com.fomo.chat.data.local.db.dao.MessageDao;
import com.fomo.chat.data.remote.api.ConversationsApi;
import com.fomo.chat.data.remote.api.MessagesApi;
import com.fomo.chat.data.remote.api.UploadApi;
import com.fomo.chat.data.repository.ChatRepository;
import com.google.gson.Gson;
import dagger.internal.DaggerGenerated;
import dagger.internal.Factory;
import dagger.internal.Preconditions;
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
public final class AppModule_ProvideChatRepositoryFactory implements Factory<ChatRepository> {
  private final Provider<ConversationsApi> conversationsApiProvider;

  private final Provider<MessagesApi> messagesApiProvider;

  private final Provider<UploadApi> uploadApiProvider;

  private final Provider<ConversationDao> conversationDaoProvider;

  private final Provider<MessageDao> messageDaoProvider;

  private final Provider<Gson> gsonProvider;

  public AppModule_ProvideChatRepositoryFactory(Provider<ConversationsApi> conversationsApiProvider,
      Provider<MessagesApi> messagesApiProvider, Provider<UploadApi> uploadApiProvider,
      Provider<ConversationDao> conversationDaoProvider, Provider<MessageDao> messageDaoProvider,
      Provider<Gson> gsonProvider) {
    this.conversationsApiProvider = conversationsApiProvider;
    this.messagesApiProvider = messagesApiProvider;
    this.uploadApiProvider = uploadApiProvider;
    this.conversationDaoProvider = conversationDaoProvider;
    this.messageDaoProvider = messageDaoProvider;
    this.gsonProvider = gsonProvider;
  }

  @Override
  public ChatRepository get() {
    return provideChatRepository(conversationsApiProvider.get(), messagesApiProvider.get(), uploadApiProvider.get(), conversationDaoProvider.get(), messageDaoProvider.get(), gsonProvider.get());
  }

  public static AppModule_ProvideChatRepositoryFactory create(
      Provider<ConversationsApi> conversationsApiProvider,
      Provider<MessagesApi> messagesApiProvider, Provider<UploadApi> uploadApiProvider,
      Provider<ConversationDao> conversationDaoProvider, Provider<MessageDao> messageDaoProvider,
      Provider<Gson> gsonProvider) {
    return new AppModule_ProvideChatRepositoryFactory(conversationsApiProvider, messagesApiProvider, uploadApiProvider, conversationDaoProvider, messageDaoProvider, gsonProvider);
  }

  public static ChatRepository provideChatRepository(ConversationsApi conversationsApi,
      MessagesApi messagesApi, UploadApi uploadApi, ConversationDao conversationDao,
      MessageDao messageDao, Gson gson) {
    return Preconditions.checkNotNullFromProvides(AppModule.INSTANCE.provideChatRepository(conversationsApi, messagesApi, uploadApi, conversationDao, messageDao, gson));
  }
}
