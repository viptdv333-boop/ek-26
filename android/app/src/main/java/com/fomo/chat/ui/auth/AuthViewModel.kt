package com.fomo.chat.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fomo.chat.data.repository.AuthRepository
import com.fomo.chat.data.repository.AuthResult
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val codeSent: Boolean = false,
    val authenticated: Boolean = false,
    val isNewUser: Boolean = false,
    val resendTimer: Int = 0
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun requestCode(phone: String) {
        if (phone.length < 10) {
            _uiState.update { it.copy(error = "Введите корректный номер телефона") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val result = authRepository.requestCode(phone)
                when (result) {
                    is AuthResult.Success -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                codeSent = true,
                                resendTimer = 60
                            )
                        }
                        startResendTimer()
                    }
                    is AuthResult.Error -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = result.message
                            )
                        }
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Ошибка звонка"
                    )
                }
            }
        }
    }

    fun verifyCode(phone: String, code: String) {
        if (code.length != 4) {
            _uiState.update { it.copy(error = "Введите 4-значный код") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val result = authRepository.verifyCode(phone, code)
                when (result) {
                    is AuthResult.Success -> {
                        // Tokens already saved inside AuthRepository.verifyCode()
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                authenticated = true,
                                isNewUser = false
                            )
                        }
                    }
                    is AuthResult.Error -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                error = result.message
                            )
                        }
                    }
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Неверный код"
                    )
                }
            }
        }
    }

    fun setupProfile(displayName: String) {
        if (displayName.isBlank()) {
            _uiState.update { it.copy(error = "Введите имя") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                // TODO: call usersApi.updateProfile when available
                _uiState.update { it.copy(isLoading = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: "Ошибка сохранения профиля"
                    )
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun resendCode(phone: String) {
        if (_uiState.value.resendTimer > 0) return
        requestCode(phone)
    }

    private fun startResendTimer() {
        viewModelScope.launch {
            while (_uiState.value.resendTimer > 0) {
                delay(1000)
                _uiState.update { it.copy(resendTimer = it.resendTimer - 1) }
            }
        }
    }
}
