package com.fomo.chat.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ConversationDto(
    @SerializedName("id") val id: String,
    @SerializedName("type") val type: String, // "direct" or "group"
    @SerializedName("name") val name: String?,
    @SerializedName("avatarUrl") val avatarUrl: String?,
    @SerializedName("participants") val participants: List<ParticipantDto>?,
    @SerializedName("lastMessage") val lastMessage: MessageDto?,
    @SerializedName("unreadCount") val unreadCount: Int?,
    @SerializedName("muted") val muted: Boolean?,
    @SerializedName("archived") val archived: Boolean?,
    @SerializedName("createdAt") val createdAt: String?,
    @SerializedName("updatedAt") val updatedAt: String?
)

data class ParticipantDto(
    @SerializedName("userId") val userId: String,
    @SerializedName("displayName") val displayName: String?,
    @SerializedName("avatarUrl") val avatarUrl: String?,
    @SerializedName("role") val role: String?, // "admin", "member"
    @SerializedName("joinedAt") val joinedAt: String?
)

data class CreateDirectRequest(
    @SerializedName("participantId") val participantId: String
)

data class CreateGroupRequest(
    @SerializedName("name") val name: String,
    @SerializedName("participantIds") val participantIds: List<String>
)

data class CreateGroupResponse(
    @SerializedName("id") val id: String
)

data class MuteResponse(
    @SerializedName("muted") val muted: Boolean
)

data class ArchiveResponse(
    @SerializedName("archived") val archived: Boolean
)

data class PinMessageRequest(
    @SerializedName("messageId") val messageId: String
)

data class PinnedMessagesResponse(
    @SerializedName("pinned") val pinned: List<MessageDto>
)
