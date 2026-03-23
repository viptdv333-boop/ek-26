package com.fomo.chat.di

import android.content.Context
import androidx.room.Room
import com.fomo.chat.data.local.db.FomoDatabase
import com.fomo.chat.data.local.db.dao.ContactDao
import com.fomo.chat.data.local.db.dao.ConversationDao
import com.fomo.chat.data.local.db.dao.MessageDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): FomoDatabase {
        return Room.databaseBuilder(
            context,
            FomoDatabase::class.java,
            "fomo_chat.db"
        )
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    @Singleton
    fun provideConversationDao(db: FomoDatabase): ConversationDao = db.conversationDao()

    @Provides
    @Singleton
    fun provideMessageDao(db: FomoDatabase): MessageDao = db.messageDao()

    @Provides
    @Singleton
    fun provideContactDao(db: FomoDatabase): ContactDao = db.contactDao()
}
