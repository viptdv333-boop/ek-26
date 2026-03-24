package com.fomo.chat.ui.chats

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fomo.chat.data.local.crypto.TokenManager
import com.fomo.chat.data.repository.ChatRepository
import com.fomo.chat.domain.model.Message as DomainMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatMessage(
    val id: String,
    val conversationId: String,
    val senderId: String,
    val senderName: String = "",
    val text: String,
    val timestamp: Long = System.currentTimeMillis(),
    val status: MessageStatus = MessageStatus.SENT,
    val replyTo: ChatMessage? = null,
    val reactions: List<ChatReaction> = emptyList(),
    val attachments: List<ChatAttachment> = emptyList(),
    val isOwn: Boolean = false
)

enum class MessageStatus {
    SENDING, SENT, DELIVERED, READ, FAILED
}

data class ChatReaction(
    val emoji: String,
    val userId: String,
    val userName: String
)

data class ChatAttachment(
    val id: String,
    val type: AttachmentType,
    val url: String,
    val name: String = "",
    val size: Long = 0,
    val thumbnailUrl: String? = null
)

enum class AttachmentType {
    IMAGE, VIDEO, FILE, AUDIO
}

data class ChatRoomUiState(
    val conversationId: String = "",
    val conversationName: String = "",
    val avatarUrl: String? = null,
    val isOnline: Boolean = false,
    val lastSeen: String = "",
    val messages: List<ChatMessage> = emptyList(),
    val isLoading: Boolean = false,
    val isLoadingMore: Boolean = false,
    val isSending: Boolean = false,
    val error: String? = null,
    val replyingTo: ChatMessage? = null,
    val isOtherTyping: Boolean = false
)

@HiltViewModel
class ChatRoomViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val chatRepository: ChatRepository,
    private val tokenManager: TokenManager
) : ViewModel() {

    private val conversationId: String = savedStateHandle["conversationId"] ?: ""
    private val myUserId: String get() = tokenManager.getUserId() ?: ""

    private val _uiState = MutableStateFlow(ChatRoomUiState(conversationId = conversationId))
    val uiState: StateFlow<ChatRoomUiState> = _uiState.asStateFlow()

    init {
        loadConversationInfo()
        observeMessages()
        refreshMessages()
    }

    private fun loadConversationInfo() {
        viewModelScope.launch {
            val result = chatRepository.getConversation(conversationId)
            result.onSuccess { conv ->
                _uiState.update {
                    it.copy(
                        conversationName = conv.name ?: conv.participants.firstOrNull { p -> p.userId != myUserId }?.displayName ?: "Чат",
                        avatarUrl = conv.avatarUrl,
                        isOnline = false,
                        lastSeen = ""
                    )
                }
            }
        }
    }

    private fun observeMessages() {
        viewModelScope.launch {
            chatRepository.observeMessages(conversationId).collect { domainMessages ->
                val chatMessages = domainMessages.map { it.toChatMessage() }
                _uiState.update { it.copy(messages = chatMessages, isLoading = false) }
            }
        }
    }

    private fun refreshMessages() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            val result = chatRepository.refreshMessages(conversationId)
            result.onFailure { e ->
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun loadMessages() {
        refreshMessages()
    }

    fun loadOlderMessages() {
        if (_uiState.value.isLoadingMore) return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingMore = true) }
            val oldestMessage = _uiState.value.messages.firstOrNull()
            val result = chatRepository.refreshMessages(conversationId, cursor = oldestMessage?.id)
            _uiState.update { it.copy(isLoadingMore = false) }
        }
    }

    fun sendMessage(text: String) {
        if (text.isBlank()) return

        // Optimistic UI - show message immediately
        val localMessage = ChatMessage(
            id = "local_${System.currentTimeMillis()}",
            conversationId = conversationId,
            senderId = myUserId,
            senderName = "Я",
            text = text.trim(),
            status = MessageStatus.SENDING,
            isOwn = true,
            replyTo = _uiState.value.replyingTo
        )

        _uiState.update {
            it.copy(
                messages = it.messages + localMessage,
                replyingTo = null,
                isSending = true
            )
        }

        viewModelScope.launch {
            val result = chatRepository.sendMessage(
                conversationId = conversationId,
                text = text.trim(),
                replyToId = _uiState.value.replyingTo?.id
            )
            result.onSuccess {
                // Remove optimistic message - real one will come from observeMessages
                _uiState.update { state ->
                    state.copy(
                        messages = state.messages.filter { it.id != localMessage.id },
                        isSending = false
                    )
                }
            }
            result.onFailure {
                _uiState.update { state ->
                    state.copy(
                        messages = state.messages.map {
                            if (it.id == localMessage.id) it.copy(status = MessageStatus.FAILED)
                            else it
                        },
                        isSending = false
                    )
                }
            }
        }
    }

    fun setReplyTo(message: ChatMessage?) {
        _uiState.update { it.copy(replyingTo = message) }
    }

    fun addReaction(messageId: String, emoji: String) {
        // Optimistic UI
        _uiState.update { state ->
            state.copy(
                messages = state.messages.map { msg ->
                    if (msg.id == messageId) {
                        val newReaction = ChatReaction(emoji = emoji, userId = myUserId, userName = "Я")
                        msg.copy(reactions = msg.reactions + newReaction)
                    } else msg
                }
            )
        }
        viewModelScope.launch {
            chatRepository.addReaction(messageId, emoji)
        }
    }

    fun sendTypingIndicator() {
        // TODO: Send typing event via WebSocket
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    private fun DomainMessage.toChatMessage(): ChatMessage {
        return ChatMessage(
            id = id,
            conversationId = conversationId,
            senderId = senderId,
            senderName = senderName ?: "",
            text = text ?: "",
            timestamp = try {
                java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
                    .parse(createdAt ?: "")?.time ?: System.currentTimeMillis()
            } catch (e: Exception) { System.currentTimeMillis() },
            status = MessageStatus.SENT,
            isOwn = senderId == myUserId,
            reactions = reactions?.map {
                ChatReaction(emoji = it.emoji, userId = it.userId, userName = "")
            } ?: emptyList(),
            attachments = attachments?.map {
                ChatAttachment(
                    id = it.fileId ?: "",
                    type = when {
                        it.mimeType?.startsWith("image") == true -> AttachmentType.IMAGE
                        it.mimeType?.startsWith("video") == true -> AttachmentType.VIDEO
                        it.mimeType?.startsWith("audio") == true -> AttachmentType.AUDIO
                        else -> AttachmentType.FILE
                    },
                    url = it.url ?: "",
                    name = it.fileName ?: "",
                    size = it.size ?: 0,
                    thumbnailUrl = it.thumbnailUrl
                )
            } ?: emptyList()
        )
    }
}
