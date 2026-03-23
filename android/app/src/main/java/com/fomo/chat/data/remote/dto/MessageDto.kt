package com.fomo.chat.data.remote.dto

import com.google.gson.annotations.SerializedName

data class MessageDto(
    @SerializedName("id") val id: String,
    @SerializedName("conversationId") val conversationId: String,
    @SerializedName("senderId") val senderId: String,
    @SerializedName("senderName") val senderName: String?,
    @SerializedName("senderAvatarUrl") val senderAvatarUrl: String?,
    @SerializedName("text") val text: String?,
    @SerializedName("type") val type: String?, // "text", "image", "file", "voice", "system"
    @SerializedName("attachments") val attachments: List<AttachmentDto>?,
    @SerializedName("replyTo") val replyTo: MessageDto?,
    @SerializedName("reactions") val reactions: List<ReactionDto>?,
    @SerializedName("readBy") val readBy: List<String>?,
    @SerializedName("editedAt") val editedAt: String?,
    @SerializedName("deletedAt") val deletedAt: String?,
    @SerializedName("createdAt") val createdAt: String
)

data class AttachmentDto(
    @SerializedName("fileId") val fileId: String,
    @SerializedName("fileName") val fileName: String,
    @SerializedName("mimeType") val mimeType: String,
    @SerializedName("size") val size: Long,
    @SerializedName("url") val url: String,
    @SerializedName("thumbnailUrl") val thumbnailUrl: String?,
    @SerializedName("width") val width: Int?,
    @SerializedName("height") val height: Int?,
    @SerializedName("duration") val duration: Int? // for voice/video in seconds
)

data class ReactionDto(
    @SerializedName("emoji") val emoji: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("createdAt") val createdAt: String?
)

data class CreateMessageRequest(
    @SerializedName("text") val text: String?,
    @SerializedName("type") val type: String = "text",
    @SerializedName("attachmentIds") val attachmentIds: List<String>? = null,
    @SerializedName("replyToId") val replyToId: String? = null
)

data class EditMessageRequest(
    @SerializedName("text") val text: String
)

data class EditMessageResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("text") val text: String,
    @SerializedName("editedAt") val editedAt: String
)

data class ReactionRequest(
    @SerializedName("emoji") val emoji: String
)

data class ReactionResponse(
    @SerializedName("reactions") val reactions: List<ReactionDto>
)

data class SearchMessagesResponse(
    @SerializedName("results") val results: List<MessageDto>
)
