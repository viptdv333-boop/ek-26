package com.fomo.chat.ui.chats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class Conversation(
    val id: String,
    val name: String,
    val avatarUrl: String? = null,
    val lastMessage: String = "",
    val lastMessageTime: Long = System.currentTimeMillis(),
    val unreadCount: Int = 0,
    val isOnline: Boolean = false,
    val isGroup: Boolean = false,
    val isTyping: Boolean = false,
    val isPinned: Boolean = false
)

data class ChatListUiState(
    val conversations: List<Conversation> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ChatListViewModel @Inject constructor() : ViewModel() {

    private val _conversations = MutableStateFlow<List<Conversation>>(emptyList())
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
            compareByDescending<Conversation> { it.isPinned }
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
                // TODO: Replace with actual API call
                // val result = chatRepository.getConversations()
                delay(500)
                _conversations.value = listOf(
                    Conversation(
                        id = "1",
                        name = "Алексей Петров",
                        lastMessage = "Привет! Как дела?",
                        unreadCount = 3,
                        isOnline = true
                    ),
                    Conversation(
                        id = "2",
                        name = "Команда разработки",
                        lastMessage = "Деплой запланирован на завтра",
                        unreadCount = 12,
                        isGroup = true
                    ),
                    Conversation(
                        id = "3",
                        name = "Мария Иванова",
                        lastMessage = "Спасибо за помощь!",
                        isOnline = true,
                        isPinned = true
                    )
                )
            } catch (e: Exception) {
                _error.value = e.message ?: "Ошибка загрузки"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            try {
                // TODO: Replace with actual API call
                delay(500)
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
