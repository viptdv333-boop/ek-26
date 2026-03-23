package com.fomo.chat.di

import android.content.Context
import com.fomo.chat.data.local.crypto.TokenManager
import com.fomo.chat.data.local.db.dao.ContactDao
import com.fomo.chat.data.local.db.dao.ConversationDao
import com.fomo.chat.data.local.db.dao.MessageDao
import com.fomo.chat.data.local.prefs.UserPreferences
import com.fomo.chat.data.remote.WebSocketClient
import com.fomo.chat.data.remote.api.AuthApi
import com.fomo.chat.data.remote.api.ContactsApi
import com.fomo.chat.data.remote.api.ConversationsApi
import com.fomo.chat.data.remote.api.MessagesApi
import com.fomo.chat.data.remote.api.UploadApi
import com.fomo.chat.data.repository.AuthRepository
import com.fomo.chat.data.repository.ChatRepository
import com.fomo.chat.data.repository.ContactRepository
import com.google.gson.Gson
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideTokenManager(@ApplicationContext context: Context): TokenManager {
        return TokenManager(context)
    }

    @Provides
    @Singleton
    fun provideUserPreferences(@ApplicationContext context: Context): UserPreferences {
        return UserPreferences(context)
    }

    @Provides
    @Singleton
    fun provideAuthRepository(
        authApi: AuthApi,
        tokenManager: TokenManager
    ): AuthRepository {
        return AuthRepository(authApi, tokenManager)
    }

    @Provides
    @Singleton
    fun provideChatRepository(
        conversationsApi: ConversationsApi,
        messagesApi: MessagesApi,
        uploadApi: UploadApi,
        conversationDao: ConversationDao,
        messageDao: MessageDao,
        gson: Gson
    ): ChatRepository {
        return ChatRepository(conversationsApi, messagesApi, uploadApi, conversationDao, messageDao, gson)
    }

    @Provides
    @Singleton
    fun provideContactRepository(
        contactsApi: ContactsApi,
        contactDao: ContactDao
    ): ContactRepository {
        return ContactRepository(contactsApi, contactDao)
    }

    @Provides
    @Singleton
    fun provideWebSocketClient(
        okHttpClient: OkHttpClient,
        tokenManager: TokenManager,
        gson: Gson
    ): WebSocketClient {
        return WebSocketClient(okHttpClient, tokenManager, gson)
    }
}
