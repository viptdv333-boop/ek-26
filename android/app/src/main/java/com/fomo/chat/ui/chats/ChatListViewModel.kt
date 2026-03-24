package com.fomo.chat.ui.chats

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fomo.chat.data.repository.ChatRepository
import com.fomo.chat.domain.model.Conversation
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatListUiState(
    val conversations: List<Conversation> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ChatListViewModel @Inject constructor(
    private val chatRepository: ChatRepository
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    private val _isLoading = MutableStateFlow(false)
    private val _isRefreshing = MutableStateFlow(false)
    private val _error = MutableStateFlow<String?>(null)

    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    val uiState: StateFlow<ChatListUiState> = combine(
        chatRepository.observeConversations(),
        _searchQuery,
        _isLoading,
        _isRefreshing,
        _error
    ) { conversations, query, loading, refreshing, error ->
        val filtered = if (query.isBlank()) {
            conversations
        } else {
            conversations.filter {
                (it.name ?: "").contains(query, ignoreCase = true) ||
                        (it.lastMessage?.text ?: "").contains(query, ignoreCase = true)
            }
        }
        val sorted = filtered.sortedByDescending { it.updatedAt }
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
            val result = chatRepository.refreshConversations()
            result.onFailure { e ->
                _error.value = e.message ?: "Ошибка загрузки"
            }
            _isLoading.value = false
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            chatRepository.refreshConversations()
            _isRefreshing.value = false
        }
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun clearError() {
        _error.value = null
    }
}
