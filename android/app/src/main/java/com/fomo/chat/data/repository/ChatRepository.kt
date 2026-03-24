package com.fomo.chat.data.repository

import com.fomo.chat.data.local.db.dao.ConversationDao
import com.fomo.chat.data.local.db.dao.MessageDao
import com.fomo.chat.data.local.db.entity.ConversationEntity
import com.fomo.chat.data.local.db.entity.MessageEntity
import com.fomo.chat.data.remote.api.ConversationsApi
import com.fomo.chat.data.remote.api.MessagesApi
import com.fomo.chat.data.remote.api.UploadApi
import com.fomo.chat.data.remote.dto.CreateDirectRequest
import com.fomo.chat.data.remote.dto.CreateGroupRequest
import com.fomo.chat.data.remote.dto.CreateMessageRequest
import com.fomo.chat.data.remote.dto.EditMessageRequest
import com.fomo.chat.data.remote.dto.PinMessageRequest
import com.fomo.chat.data.remote.dto.ReactionRequest
import com.fomo.chat.domain.model.Attachment
import com.fomo.chat.domain.model.Conversation
import com.fomo.chat.domain.model.ConversationType
import com.fomo.chat.domain.model.Message
import com.fomo.chat.domain.model.MessageType
import com.fomo.chat.domain.model.Participant
import com.fomo.chat.domain.model.Reaction
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatRepository @Inject constructor(
    private val conversationsApi: ConversationsApi,
    private val messagesApi: MessagesApi,
    private val uploadApi: UploadApi,
    private val conversationDao: ConversationDao,
    private val messageDao: MessageDao,
    private val gson: Gson,
    private val tokenManager: com.fomo.chat.data.local.crypto.TokenManager
) {

    private fun resolveConversationName(dto: com.fomo.chat.data.remote.dto.ConversationDto): String? {
        // For group chats, use the group name
        if (dto.type == "group") return dto.name

        // For direct chats, find the OTHER participant's name
        if (dto.name != null) return dto.name
        val myId = tokenManager.getUserId()
        val otherParticipant = dto.participants?.firstOrNull { it.userId != myId }
        return otherParticipant?.displayName ?: dto.participants?.firstOrNull()?.displayName
    }

    private fun resolveConversationAvatar(dto: com.fomo.chat.data.remote.dto.ConversationDto): String? {
        if (dto.avatarUrl != null) return dto.avatarUrl
        if (dto.type == "direct") {
            val myId = tokenManager.getUserId()
            val otherParticipant = dto.participants?.firstOrNull { it.userId != myId }
            return otherParticipant?.avatarUrl
        }
        return null
    }

    // --- Conversations ---

    fun observeConversations(): Flow<List<Conversation>> {
        return conversationDao.observeAll().map { entities ->
            entities.map { it.toDomain() }
        }
    }

    fun observeArchivedConversations(): Flow<List<Conversation>> {
        return conversationDao.observeArchived().map { entities ->
            entities.map { it.toDomain() }
        }
    }

    suspend fun refreshConversations(cursor: String? = null, limit: Int? = 50): Result<List<Conversation>> {
        return try {
            val response = conversationsApi.getConversations(cursor, limit)
            if (response.isSuccessful) {
                val dtos = response.body() ?: emptyList()
                val entities = dtos.map { dto ->
                    ConversationEntity(
                        id = dto.id,
                        type = dto.type,
                        name = resolveConversationName(dto),
                        avatarUrl = resolveConversationAvatar(dto),
                        lastMessageId = dto.lastMessage?.id,
                        lastMessageText = dto.lastMessage?.text,
                        lastMessageSenderId = dto.lastMessage?.senderId,
                        lastMessageCreatedAt = dto.lastMessage?.createdAt,
                        unreadCount = dto.unreadCount ?: 0,
                        muted = dto.muted ?: false,
                        archived = dto.archived ?: false,
                        createdAt = dto.createdAt,
                        updatedAt = dto.updatedAt
                    )
                }
                conversationDao.upsertAll(entities)
                Result.success(entities.map { it.toDomain() })
            } else {
                Result.failure(Exception("Failed to fetch conversations: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getConversation(id: String): Result<Conversation> {
        return try {
            val response = conversationsApi.getConversation(id)
            if (response.isSuccessful) {
                val dto = response.body()!!
                val entity = ConversationEntity(
                    id = dto.id,
                    type = dto.type,
                    name = resolveConversationName(dto),
                    avatarUrl = resolveConversationAvatar(dto),
                    lastMessageId = dto.lastMessage?.id,
                    lastMessageText = dto.lastMessage?.text,
                    lastMessageSenderId = dto.lastMessage?.senderId,
                    lastMessageCreatedAt = dto.lastMessage?.createdAt,
                    unreadCount = dto.unreadCount ?: 0,
                    muted = dto.muted ?: false,
                    archived = dto.archived ?: false,
                    createdAt = dto.createdAt,
                    updatedAt = dto.updatedAt
                )
                conversationDao.upsert(entity)
                Result.success(entity.toDomain())
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createDirect(participantId: String): Result<Conversation> {
        return try {
            val response = conversationsApi.createDirect(CreateDirectRequest(participantId))
            if (response.isSuccessful) {
                val dto = response.body()!!
                val entity = ConversationEntity(
                    id = dto.id,
                    type = dto.type,
                    name = dto.name,
                    avatarUrl = dto.avatarUrl,
                    lastMessageId = null,
                    lastMessageText = null,
                    lastMessageSenderId = null,
                    lastMessageCreatedAt = null,
                    unreadCount = 0,
                    muted = false,
                    archived = false,
                    createdAt = dto.createdAt,
                    updatedAt = dto.updatedAt
                )
                conversationDao.upsert(entity)
                Result.success(entity.toDomain())
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createGroup(name: String, participantIds: List<String>): Result<String> {
        return try {
            val response = conversationsApi.createGroup(CreateGroupRequest(name, participantIds))
            if (response.isSuccessful) {
                Result.success(response.body()!!.id)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteConversation(id: String): Result<Unit> {
        return try {
            val response = conversationsApi.deleteConversation(id)
            if (response.isSuccessful) {
                conversationDao.deleteById(id)
                messageDao.deleteByConversation(id)
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun toggleMute(id: String): Result<Boolean> {
        return try {
            val response = conversationsApi.toggleMute(id)
            if (response.isSuccessful) {
                Result.success(response.body()!!.muted)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun toggleArchive(id: String): Result<Boolean> {
        return try {
            val response = conversationsApi.toggleArchive(id)
            if (response.isSuccessful) {
                Result.success(response.body()!!.archived)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- Messages ---

    fun observeMessages(conversationId: String): Flow<List<Message>> {
        return messageDao.observeByConversation(conversationId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    suspend fun refreshMessages(conversationId: String, cursor: String? = null, limit: Int? = 50): Result<List<Message>> {
        return try {
            val response = conversationsApi.getMessages(conversationId, cursor, limit)
            if (response.isSuccessful) {
                val dtos = response.body() ?: emptyList()
                val entities = dtos.map { it.toEntity() }
                messageDao.upsertAll(entities)
                Result.success(entities.map { it.toDomain() })
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun sendMessage(
        conversationId: String,
        text: String?,
        type: String = "text",
        attachmentIds: List<String>? = null,
        replyToId: String? = null
    ): Result<Message> {
        return try {
            val response = conversationsApi.sendMessage(
                conversationId,
                CreateMessageRequest(text, type, attachmentIds, replyToId)
            )
            if (response.isSuccessful) {
                val dto = response.body()!!
                val entity = dto.toEntity()
                messageDao.upsert(entity)
                Result.success(entity.toDomain())
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun editMessage(messageId: String, newText: String): Result<Unit> {
        return try {
            val response = messagesApi.editMessage(messageId, EditMessageRequest(newText))
            if (response.isSuccessful) {
                val existing = messageDao.getById(messageId)
                if (existing != null) {
                    messageDao.upsert(
                        existing.copy(
                            text = response.body()!!.text,
                            editedAt = response.body()!!.editedAt
                        )
                    )
                }
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun deleteMessage(messageId: String): Result<Unit> {
        return try {
            val response = messagesApi.deleteMessage(messageId)
            if (response.isSuccessful) {
                messageDao.deleteById(messageId)
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun addReaction(messageId: String, emoji: String): Result<List<Reaction>> {
        return try {
            val response = messagesApi.addReaction(messageId, ReactionRequest(emoji))
            if (response.isSuccessful) {
                val reactions = response.body()!!.reactions.map {
                    Reaction(emoji = it.emoji, userId = it.userId, createdAt = it.createdAt)
                }
                // Update cached message
                val existing = messageDao.getById(messageId)
                if (existing != null) {
                    messageDao.upsert(
                        existing.copy(reactionsJson = gson.toJson(response.body()!!.reactions))
                    )
                }
                Result.success(reactions)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun searchMessages(query: String): Result<List<Message>> {
        return try {
            val response = messagesApi.searchMessages(query)
            if (response.isSuccessful) {
                val messages = response.body()!!.results.map { it.toEntity().toDomain() }
                Result.success(messages)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- Pins ---

    suspend fun getPinnedMessages(conversationId: String): Result<List<Message>> {
        return try {
            val response = conversationsApi.getPinnedMessages(conversationId)
            if (response.isSuccessful) {
                val messages = response.body()!!.pinned.map { it.toEntity().toDomain() }
                Result.success(messages)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun pinMessage(conversationId: String, messageId: String): Result<Unit> {
        return try {
            val response = conversationsApi.pinMessage(conversationId, PinMessageRequest(messageId))
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Failed: ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun unpinMessage(conversationId: String, messageId: String): Result<Unit> {
        return try {
            val response = conversationsApi.unpinMessage(conversationId, messageId)
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("Failed: ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- Upload ---

    suspend fun uploadFile(file: File, mimeType: String): Result<String> {
        return try {
            val requestBody = file.asRequestBody(mimeType.toMediaTypeOrNull())
            val part = MultipartBody.Part.createFormData("file", file.name, requestBody)
            val response = uploadApi.upload(part)
            if (response.isSuccessful) {
                Result.success(response.body()!!.fileId)
            } else {
                Result.failure(Exception("Upload failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // --- Local cache management ---

    suspend fun markConversationRead(conversationId: String) {
        conversationDao.markRead(conversationId)
    }

    suspend fun clearAllData() {
        conversationDao.deleteAll()
        messageDao.deleteAll()
    }

    // --- Mappers ---

    private fun com.fomo.chat.data.remote.dto.MessageDto.toEntity(): MessageEntity {
        return MessageEntity(
            id = id,
            conversationId = conversationId,
            senderId = senderId,
            senderName = senderName,
            senderAvatarUrl = senderAvatarUrl,
            text = text,
            type = type ?: "text",
            attachmentsJson = attachments?.let { gson.toJson(it) },
            replyToId = replyTo?.id,
            reactionsJson = reactions?.let { gson.toJson(it) },
            editedAt = editedAt,
            deletedAt = deletedAt,
            createdAt = createdAt
        )
    }

    private fun MessageEntity.toDomain(): Message {
        val attachmentList: List<Attachment> = if (attachmentsJson != null) {
            try {
                val type = object : TypeToken<List<com.fomo.chat.data.remote.dto.AttachmentDto>>() {}.type
                val dtos: List<com.fomo.chat.data.remote.dto.AttachmentDto> = gson.fromJson(attachmentsJson, type)
                dtos.map {
                    Attachment(
                        fileId = it.fileId,
                        fileName = it.fileName,
                        mimeType = it.mimeType,
                        size = it.size,
                        url = it.url,
                        thumbnailUrl = it.thumbnailUrl,
                        width = it.width,
                        height = it.height,
                        duration = it.duration
                    )
                }
            } catch (_: Exception) {
                emptyList()
            }
        } else emptyList()

        val reactionList: List<Reaction> = if (reactionsJson != null) {
            try {
                val type = object : TypeToken<List<com.fomo.chat.data.remote.dto.ReactionDto>>() {}.type
                val dtos: List<com.fomo.chat.data.remote.dto.ReactionDto> = gson.fromJson(reactionsJson, type)
                dtos.map { Reaction(emoji = it.emoji, userId = it.userId, createdAt = it.createdAt) }
            } catch (_: Exception) {
                emptyList()
            }
        } else emptyList()

        return Message(
            id = id,
            conversationId = conversationId,
            senderId = senderId,
            senderName = senderName,
            senderAvatarUrl = senderAvatarUrl,
            text = text,
            type = MessageType.fromString(this.type),
            attachments = attachmentList,
            replyTo = null, // Reply loaded separately if needed
            reactions = reactionList,
            readBy = emptyList(),
            editedAt = editedAt,
            deletedAt = deletedAt,
            createdAt = createdAt
        )
    }

    private fun ConversationEntity.toDomain(): Conversation {
        return Conversation(
            id = id,
            type = ConversationType.fromString(type),
            name = name,
            avatarUrl = avatarUrl,
            participants = emptyList(), // Loaded from API when needed
            lastMessage = if (lastMessageId != null) {
                Message(
                    id = lastMessageId,
                    conversationId = id,
                    senderId = lastMessageSenderId ?: "",
                    senderName = null,
                    senderAvatarUrl = null,
                    text = lastMessageText,
                    type = MessageType.TEXT,
                    attachments = emptyList(),
                    replyTo = null,
                    reactions = emptyList(),
                    readBy = emptyList(),
                    editedAt = null,
                    deletedAt = null,
                    createdAt = lastMessageCreatedAt ?: ""
                )
            } else null,
            unreadCount = unreadCount,
            muted = muted,
            archived = archived,
            createdAt = createdAt,
            updatedAt = updatedAt
        )
    }
}
