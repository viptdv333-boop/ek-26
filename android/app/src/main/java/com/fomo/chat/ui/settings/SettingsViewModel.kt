package com.fomo.chat.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fomo.chat.data.remote.api.UsersApi
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class UserProfile(
    val id: String = "",
    val name: String = "",
    val phone: String = "",
    val avatarUrl: String? = null,
    val status: String = ""
)

data class AppPreferences(
    val isDarkTheme: Boolean = true,
    val fontSize: Float = 1.0f,
    val bubbleShape: BubbleShape = BubbleShape.ROUNDED,
    val bubbleColor: BubbleColor = BubbleColor.INDIGO
)

enum class BubbleShape(val label: String) {
    ROUNDED("Скруглённые"),
    SHARP("Прямые"),
    CLOUD("Облако")
}

enum class BubbleColor(val label: String) {
    INDIGO("Индиго"),
    BLUE("Синий"),
    GREEN("Зелёный"),
    PURPLE("Фиолетовый"),
    PINK("Розовый")
}

data class SettingsUiState(
    val profile: UserProfile = UserProfile(),
    val preferences: AppPreferences = AppPreferences(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val showLogoutDialog: Boolean = false,
    val showDeleteDialog: Boolean = false
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val usersApi: UsersApi
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
        loadPreferences()
    }

    private fun loadProfile() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val response = usersApi.getMe()
                if (response.isSuccessful) {
                    val user = response.body()!!
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            profile = UserProfile(
                                id = user.id,
                                name = user.displayName ?: "",
                                phone = user.phone ?: "",
                                avatarUrl = user.avatarUrl,
                                status = if (user.isOnline == true) "В сети" else "Доступен"
                            )
                        )
                    }
                } else {
                    _uiState.update { it.copy(isLoading = false, error = "Ошибка загрузки профиля") }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(isLoading = false, error = e.message)
                }
            }
        }
    }

    private fun loadPreferences() {
        viewModelScope.launch {
            // TODO: Load from DataStore
            _uiState.update {
                it.copy(preferences = AppPreferences())
            }
        }
    }

    fun updateName(name: String) {
        _uiState.update {
            it.copy(profile = it.profile.copy(name = name))
        }
        // TODO: Save to API
    }

    fun updateStatus(status: String) {
        _uiState.update {
            it.copy(profile = it.profile.copy(status = status))
        }
        // TODO: Save to API
    }

    fun toggleTheme() {
        _uiState.update {
            it.copy(
                preferences = it.preferences.copy(
                    isDarkTheme = !it.preferences.isDarkTheme
                )
            )
        }
        // TODO: Save to DataStore
    }

    fun updateFontSize(size: Float) {
        _uiState.update {
            it.copy(
                preferences = it.preferences.copy(fontSize = size)
            )
        }
        // TODO: Save to DataStore
    }

    fun updateBubbleShape(shape: BubbleShape) {
        _uiState.update {
            it.copy(
                preferences = it.preferences.copy(bubbleShape = shape)
            )
        }
        // TODO: Save to DataStore
    }

    fun updateBubbleColor(color: BubbleColor) {
        _uiState.update {
            it.copy(
                preferences = it.preferences.copy(bubbleColor = color)
            )
        }
        // TODO: Save to DataStore
    }

    fun showLogoutDialog() {
        _uiState.update { it.copy(showLogoutDialog = true) }
    }

    fun dismissLogoutDialog() {
        _uiState.update { it.copy(showLogoutDialog = false) }
    }

    fun logout() {
        viewModelScope.launch {
            // TODO: Clear tokens, navigate to auth
            _uiState.update { it.copy(showLogoutDialog = false) }
        }
    }

    fun showDeleteAccountDialog() {
        _uiState.update { it.copy(showDeleteDialog = true) }
    }

    fun dismissDeleteAccountDialog() {
        _uiState.update { it.copy(showDeleteDialog = false) }
    }

    fun deleteAccount() {
        viewModelScope.launch {
            // TODO: API call to delete account, clear all data
            _uiState.update { it.copy(showDeleteDialog = false) }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
