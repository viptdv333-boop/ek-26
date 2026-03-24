package com.fomo.chat.ui.contacts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fomo.chat.data.repository.ContactRepository
import com.fomo.chat.domain.model.Contact
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ContactsUiState(
    val contacts: List<Contact> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ContactsViewModel @Inject constructor(
    private val contactRepository: ContactRepository
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    private val _isLoading = MutableStateFlow(false)
    private val _error = MutableStateFlow<String?>(null)

    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    val uiState: StateFlow<ContactsUiState> = combine(
        contactRepository.observeContacts(),
        _searchQuery,
        _isLoading,
        _error
    ) { contacts, query, loading, error ->
        val filtered = if (query.isBlank()) {
            contacts
        } else {
            contacts.filter {
                (it.displayName ?: "").contains(query, ignoreCase = true) ||
                        (it.phone ?: "").contains(query)
            }
        }
        val sorted = filtered.sortedWith(
            compareByDescending<Contact> { it.isOnline }
                .thenBy { it.displayName ?: "" }
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
            val result = contactRepository.refreshContacts()
            result.onFailure { e ->
                _error.value = e.message ?: "Ошибка загрузки контактов"
            }
            _isLoading.value = false
        }
    }

    fun addContact(contactUserId: String, nickname: String? = null) {
        viewModelScope.launch {
            val result = contactRepository.addContact(contactUserId, nickname)
            result.onFailure { e ->
                _error.value = e.message ?: "Ошибка добавления контакта"
            }
        }
    }

    fun removeContact(userId: String) {
        viewModelScope.launch {
            val result = contactRepository.removeContact(userId)
            result.onFailure { e ->
                _error.value = e.message ?: "Ошибка удаления контакта"
            }
        }
    }

    fun toggleFavorite(userId: String, currentFavorite: Boolean) {
        viewModelScope.launch {
            contactRepository.updateContact(userId, isFavorite = !currentFavorite)
        }
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun clearError() {
        _error.value = null
    }
}
