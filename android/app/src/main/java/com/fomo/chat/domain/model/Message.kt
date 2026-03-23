package com.fomo.chat.domain.model

data class Message(
    val id: String,
    val conversationId: String,
    val senderId: String,
    val senderName: String?,
    val senderAvatarUrl: String?,
    val text: String?,
    val type: MessageType,
    val attachments: List<Attachment>,
    val replyTo: Message?,
    val reactions: List<Reaction>,
    val readBy: List<String>,
    val editedAt: String?,
    val deletedAt: String?,
    val createdAt: String
)

enum class MessageType {
    TEXT, IMAGE, FILE, VOICE, SYSTEM;

    companion object {
        fun fromString(value: String?): MessageType = when (value?.lowercase()) {
            "image" -> IMAGE
            "file" -> FILE
            "voice" -> VOICE
            "system" -> SYSTEM
            else -> TEXT
        }
    }
}

data class Attachment(
    val fileId: String,
    val fileName: String,
    val mimeType: String,
    val size: Long,
    val url: String,
    val thumbnailUrl: String?,
    val width: Int?,
    val height: Int?,
    val duration: Int?
)

data class Reaction(
    val emoji: String,
    val userId: String,
    val createdAt: String?
)
