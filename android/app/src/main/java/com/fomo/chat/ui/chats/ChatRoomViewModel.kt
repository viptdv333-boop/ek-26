package com.fomo.chat.ui.chats

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class Message(
    val id: String,
    val conversationId: String,
    val senderId: String,
    val senderName: String = "",
    val text: String,
    val timestamp: Long = System.currentTimeMillis(),
    val status: MessageStatus = MessageStatus.SENT,
    val replyTo: Message? = null,
    val reactions: List<Reaction> = emptyList(),
    val attachments: List<Attachment> = emptyList(),
    val isOwn: Boolean = false
)

enum class MessageStatus {
    SENDING, SENT, DELIVERED, READ, FAILED
}

data class Reaction(
    val emoji: String,
    val userId: String,
    val userName: String
)

data class Attachment(
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
    val messages: List<Message> = emptyList(),
    val isLoading: Boolean = false,
    val isLoadingMore: Boolean = false,
    val isSending: Boolean = false,
    val error: String? = null,
    val replyingTo: Message? = null,
    val isOtherTyping: Boolean = false
)

@HiltViewModel
class ChatRoomViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val conversationId: String = savedStateHandle["conversationId"] ?: ""

    private val _uiState = MutableStateFlow(ChatRoomUiState(conversationId = conversationId))
    val uiState: StateFlow<ChatRoomUiState> = _uiState.asStateFlow()

    init {
        loadMessages()
        loadConversationInfo()
    }

    private fun loadConversationInfo() {
        viewModelScope.launch {
            // TODO: Replace with actual API call
            _uiState.update {
                it.copy(
                    conversationName = "Алексей Петров",
                    isOnline = true,
                    lastSeen = "в сети"
                )
            }
        }
    }

    fun loadMessages() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                // TODO: Replace with actual API call
                delay(300)
                val mockMessages = listOf(
                    Message(
                        id = "1",
                        conversationId = conversationId,
                        senderId = "other",
                        senderName = "Алексей",
                        text = "Привет! Как дела?",
                        timestamp = System.currentTimeMillis() - 300000,
                        status = MessageStatus.READ,
                        isOwn = false
                    ),
                    Message(
                        id = "2",
                        conversationId = conversationId,
                        senderId = "me",
                        senderName = "Я",
                        text = "Привет! Всё отлично, спасибо!",
                        timestamp = System.currentTimeMillis() - 240000,
                        status = MessageStatus.READ,
                        isOwn = true
                    ),
                    Message(
                        id = "3",
                        conversationId = conversationId,
                        senderId = "other",
                        senderName = "Алексей",
                        text = "Ты видел новый релиз?",
                        timestamp = System.currentTimeMillis() - 60000,
                        status = MessageStatus.DELIVERED,
                        isOwn = false
                    )
                )
                _uiState.update {
                    it.copy(isLoading = false, messages = mockMessages)
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message)
                }
            }
        }
    }

    fun loadOlderMessages() {
        if (_uiState.value.isLoadingMore) return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingMore = true) }
            try {
                // TODO: Replace with actual API call with pagination
                delay(500)
                _uiState.update { it.copy(isLoadingMore = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoadingMore = false) }
            }
        }
    }

    fun sendMessage(text: String) {
        if (text.isBlank()) return

        val message = Message(
            id = "local_${System.currentTimeMillis()}",
            conversationId = conversationId,
            senderId = "me",
            senderName = "Я",
            text = text.trim(),
            status = MessageStatus.SENDING,
            isOwn = true,
            replyTo = _uiState.value.replyingTo
        )

        _uiState.update {
            it.copy(
                messages = it.messages + message,
                replyingTo = null
            )
        }

        viewModelScope.launch {
            try {
                // TODO: Replace with actual API/WebSocket call
                delay(300)
                _uiState.update { state ->
                    state.copy(
                        messages = state.messages.map {
                            if (it.id == message.id) it.copy(status = MessageStatus.SENT)
                            else it
                        }
                    )
                }
            } catch (e: Exception) {
                _uiState.update { state ->
                    state.copy(
                        messages = state.messages.map {
                            if (it.id == message.id) it.copy(status = MessageStatus.FAILED)
                            else it
                        }
                    )
                }
            }
        }
    }

    fun setReplyTo(message: Message?) {
        _uiState.update { it.copy(replyingTo = message) }
    }

    fun addReaction(messageId: String, emoji: String) {
        _uiState.update { state ->
            state.copy(
                messages = state.messages.map { msg ->
                    if (msg.id == messageId) {
                        val newReaction = Reaction(emoji = emoji, userId = "me", userName = "Я")
                        msg.copy(reactions = msg.reactions + newReaction)
                    } else msg
                }
            )
        }
        // TODO: Send reaction to API
    }

    fun sendTypingIndicator() {
        // TODO: Send typing event via WebSocket
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
