package com.fomo.chat.data.local.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "messages")
data class MessageEntity(
    @PrimaryKey val id: String,
    val conversationId: String,
    val senderId: String,
    val senderName: String?,
    val senderAvatarUrl: String?,
    val text: String?,
    val type: String,
    val attachmentsJson: String?, // JSON serialized attachments
    val replyToId: String?,
    val reactionsJson: String?, // JSON serialized reactions
    val editedAt: String?,
    val deletedAt: String?,
    val createdAt: String
)
