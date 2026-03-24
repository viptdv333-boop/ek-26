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

enum class AuthMode { LOGIN, REGISTER }

enum class RegisterStep { FORM, CODE, EMAIL_WAIT }

data class AuthUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val codeSent: Boolean = false,
    val authenticated: Boolean = false,
    val isNewUser: Boolean = false,
    val resendTimer: Int = 0,
    // New auth flow state
    val mode: AuthMode = AuthMode.LOGIN,
    val registerStep: RegisterStep = RegisterStep.FORM,
    val registerCodeVerified: Boolean = false,
    val passwordSet: Boolean = false
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    fun setMode(mode: AuthMode) {
        _uiState.update {
            it.copy(
                mode = mode,
                error = null,
                codeSent = false,
                registerStep = RegisterStep.FORM,
                registerCodeVerified = false
            )
        }
    }

    // --- Old flash-call flow (kept for backward compat) ---

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

    // --- New auth flow ---

    fun login(phone: String, password: String) {
        if (phone.length < 10) {
            _uiState.update { it.copy(error = "Введите корректный номер телефона") }
            return
        }
        if (password.isBlank()) {
            _uiState.update { it.copy(error = "Введите пароль") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val result = authRepository.login(phone, password)
                when (result) {
                    is AuthResult.Success -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                authenticated = true
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
                        error = e.message ?: "Ошибка входа"
                    )
                }
            }
        }
    }

    fun register(phone: String, email: String, password: String, confirmPassword: String) {
        if (phone.length < 10) {
            _uiState.update { it.copy(error = "Введите корректный номер телефона") }
            return
        }
        if (email.isBlank() || !email.contains("@")) {
            _uiState.update { it.copy(error = "Введите корректный email") }
            return
        }
        if (password.length < 6) {
            _uiState.update { it.copy(error = "Пароль должен быть не менее 6 символов") }
            return
        }
        if (password != confirmPassword) {
            _uiState.update { it.copy(error = "Пароли не совпадают") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val result = authRepository.register(phone, email, password, confirmPassword)
                when (result) {
                    is AuthResult.Success -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                codeSent = true,
                                registerStep = RegisterStep.CODE,
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
                        error = e.message ?: "Ошибка регистрации"
                    )
                }
            }
        }
    }

    fun registerVerifyCode(phone: String, code: String) {
        if (code.length != 4) {
            _uiState.update { it.copy(error = "Введите 4-значный код") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val result = authRepository.registerVerifyPhone(phone, code)
                when (result) {
                    is AuthResult.Success -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                registerCodeVerified = true,
                                registerStep = RegisterStep.EMAIL_WAIT
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

    fun setPassword(password: String, confirmPassword: String) {
        if (password.length < 6) {
            _uiState.update { it.copy(error = "Пароль должен быть не менее 6 символов") }
            return
        }
        if (password != confirmPassword) {
            _uiState.update { it.copy(error = "Пароли не совпадают") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val result = authRepository.setPassword(password, confirmPassword)
                when (result) {
                    is AuthResult.Success -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                passwordSet = true
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
                        error = e.message ?: "Ошибка установки пароля"
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
