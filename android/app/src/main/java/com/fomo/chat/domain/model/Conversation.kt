package com.fomo.chat.domain.model

data class Conversation(
    val id: String,
    val type: ConversationType,
    val name: String?,
    val avatarUrl: String?,
    val participants: List<Participant>,
    val lastMessage: Message?,
    val unreadCount: Int,
    val muted: Boolean,
    val archived: Boolean,
    val createdAt: String?,
    val updatedAt: String?
)

enum class ConversationType {
    DIRECT, GROUP;

    companion object {
        fun fromString(value: String): ConversationType = when (value.lowercase()) {
            "direct" -> DIRECT
            "group" -> GROUP
            else -> DIRECT
        }
    }
}

data class Participant(
    val userId: String,
    val displayName: String?,
    val avatarUrl: String?,
    val role: String?,
    val joinedAt: String?
)
