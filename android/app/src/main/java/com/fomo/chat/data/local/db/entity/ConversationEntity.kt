package com.fomo.chat.data.local.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "conversations")
data class ConversationEntity(
    @PrimaryKey val id: String,
    val type: String,
    val name: String?,
    val avatarUrl: String?,
    val lastMessageId: String?,
    val lastMessageText: String?,
    val lastMessageSenderId: String?,
    val lastMessageCreatedAt: String?,
    val unreadCount: Int,
    val muted: Boolean,
    val archived: Boolean,
    val createdAt: String?,
    val updatedAt: String?
)
