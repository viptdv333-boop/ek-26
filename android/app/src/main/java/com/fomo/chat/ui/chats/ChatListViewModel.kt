package com.fomo.chat.ui.chats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fomo.chat.data.repository.ChatRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ConversationItem(
    val id: String,
    val name: String,
    val avatarUrl: String? = null,
    val lastMessage: String = "",
    val lastMessageTime: Long = System.currentTimeMillis(),
    val unreadCount: Int = 0,
    val isOnline: Boolean = false,
    val isGroup: Boolean = false,
    val isPinned: Boolean = false
)

data class ChatListUiState(
    val conversations: List<ConversationItem> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ChatListViewModel @Inject constructor(
    private val chatRepository: ChatRepository
) : ViewModel() {

    private val _conversations = MutableStateFlow<List<ConversationItem>>(emptyList())
    private val _searchQuery = MutableStateFlow("")
    private val _isLoading = MutableStateFlow(false)
    private val _isRefreshing = MutableStateFlow(false)
    private val _error = MutableStateFlow<String?>(null)

    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    val uiState: StateFlow<ChatListUiState> = combine(
        _conversations,
        _searchQuery,
        _isLoading,
        _isRefreshing,
        _error
    ) { conversations, query, loading, refreshing, error ->
        val filtered = if (query.isBlank()) {
            conversations
        } else {
            conversations.filter {
                it.name.contains(query, ignoreCase = true) ||
                        it.lastMessage.contains(query, ignoreCase = true)
            }
        }
        val sorted = filtered.sortedWith(
            compareByDescending<ConversationItem> { it.isPinned }
                .thenByDescending { it.lastMessageTime }
        )
        ChatListUiState(
            conversations = sorted,
            isLoading = loading,
            isRefreshing = refreshing,
            error = error
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = ChatListUiState(isLoading = true)
    )

    init {
        loadConversations()
    }

    fun loadConversations() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val result = chatRepository.getConversations()
                _conversations.value = result.map { conv ->
                    ConversationItem(
                        id = conv.id,
                        name = conv.name ?: conv.participants?.firstOrNull()?.displayName ?: "Чат",
                        avatarUrl = conv.avatarUrl ?: conv.participants?.firstOrNull()?.avatarUrl,
                        lastMessage = conv.lastMessage?.text ?: "",
                        lastMessageTime = try {
                            java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
                                .parse(conv.updatedAt ?: "")?.time ?: System.currentTimeMillis()
                        } catch (e: Exception) { System.currentTimeMillis() },
                        unreadCount = conv.unreadCount ?: 0,
                        isGroup = conv.type == "group",
                        isPinned = false
                    )
                }
            } catch (e: Exception) {
                _error.value = e.message ?: "Ошибка загрузки"
                _conversations.value = emptyList()
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            try {
                loadConversations()
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun clearError() {
        _error.value = null
    }
}
