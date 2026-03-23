package com.fomo.chat.data.local.db

import androidx.room.Database
import androidx.room.RoomDatabase
import com.fomo.chat.data.local.db.dao.ContactDao
import com.fomo.chat.data.local.db.dao.ConversationDao
import com.fomo.chat.data.local.db.dao.MessageDao
import com.fomo.chat.data.local.db.entity.ContactEntity
import com.fomo.chat.data.local.db.entity.ConversationEntity
import com.fomo.chat.data.local.db.entity.MessageEntity

@Database(
    entities = [
        ConversationEntity::class,
        MessageEntity::class,
        ContactEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class FomoDatabase : RoomDatabase() {
    abstract fun conversationDao(): ConversationDao
    abstract fun messageDao(): MessageDao
    abstract fun contactDao(): ContactDao
}
