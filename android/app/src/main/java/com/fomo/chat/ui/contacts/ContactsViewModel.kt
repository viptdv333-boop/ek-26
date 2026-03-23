package com.fomo.chat.ui.contacts

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
import kotlinx.coroutines.launch
import javax.inject.Inject

data class Contact(
    val id: String,
    val name: String,
    val phone: String,
    val avatarUrl: String? = null,
    val isOnline: Boolean = false,
    val lastSeen: String = "",
    val conversationId: String? = null
)

data class ContactsUiState(
    val contacts: List<Contact> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ContactsViewModel @Inject constructor() : ViewModel() {

    private val _contacts = MutableStateFlow<List<Contact>>(emptyList())
    private val _searchQuery = MutableStateFlow("")
    private val _isLoading = MutableStateFlow(false)
    private val _error = MutableStateFlow<String?>(null)

    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    val uiState: StateFlow<ContactsUiState> = combine(
        _contacts,
        _searchQuery,
        _isLoading,
        _error
    ) { contacts, query, loading, error ->
        val filtered = if (query.isBlank()) {
            contacts
        } else {
            contacts.filter {
                it.name.contains(query, ignoreCase = true) ||
                        it.phone.contains(query)
            }
        }
        val sorted = filtered.sortedWith(
            compareByDescending<Contact> { it.isOnline }
                .thenBy { it.name }
        )
        ContactsUiState(
            contacts = sorted,
            isLoading = loading,
            error = error
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = ContactsUiState(isLoading = true)
    )

    init {
        loadContacts()
    }

    fun loadContacts() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                // TODO: Replace with actual API call
                delay(500)
                _contacts.value = listOf(
                    Contact(
                        id = "1",
                        name = "Алексей Петров",
                        phone = "+7 900 123 45 67",
                        isOnline = true,
                        conversationId = "1"
                    ),
                    Contact(
                        id = "2",
                        name = "Мария Иванова",
                        phone = "+7 900 234 56 78",
                        isOnline = true,
                        conversationId = "3"
                    ),
                    Contact(
                        id = "3",
                        name = "Дмитрий Сидоров",
                        phone = "+7 900 345 67 89",
                        isOnline = false,
                        lastSeen = "был(а) вчера в 21:30"
                    ),
                    Contact(
                        id = "4",
                        name = "Елена Козлова",
                        phone = "+7 900 456 78 90",
                        isOnline = false,
                        lastSeen = "был(а) 2 часа назад"
                    )
                )
            } catch (e: Exception) {
                _error.value = e.message ?: "Ошибка загрузки контактов"
            } finally {
                _isLoading.value = false
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
