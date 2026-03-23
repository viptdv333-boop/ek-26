package com.fomo.chat.data.repository

import com.fomo.chat.data.local.crypto.TokenManager
import com.fomo.chat.data.remote.api.AuthApi
import com.fomo.chat.data.remote.dto.AuthRequestCodeRequest
import com.fomo.chat.data.remote.dto.AuthVerifyCodeRequest
import com.fomo.chat.data.remote.dto.RefreshTokenRequest
import com.fomo.chat.domain.model.User
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Singleton

sealed class AuthResult<out T> {
    data class Success<T>(val data: T) : AuthResult<T>()
    data class Error(val message: String, val code: Int? = null) : AuthResult<Nothing>()
}

@Singleton
class AuthRepository @Inject constructor(
    private val authApi: AuthApi,
    private val tokenManager: TokenManager
) {
    private val refreshMutex = Mutex()

    val isAuthenticated: Boolean
        get() = tokenManager.getAccessToken() != null

    val currentUserId: String?
        get() = tokenManager.getUserId()

    suspend fun requestCode(phone: String): AuthResult<Boolean> {
        return try {
            val response = authApi.requestCode(AuthRequestCodeRequest(phone))
            if (response.isSuccessful && response.body()?.success == true) {
                AuthResult.Success(true)
            } else {
                AuthResult.Error(
                    message = "Failed to send verification code",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            AuthResult.Error(message = e.message ?: "Network error")
        }
    }

    suspend fun verifyCode(phone: String, code: String): AuthResult<User> {
        return try {
            val response = authApi.verifyCode(AuthVerifyCodeRequest(phone, code))
            if (response.isSuccessful) {
                val body = response.body()!!
                tokenManager.saveTokens(
                    accessToken = body.accessToken,
                    refreshToken = body.refreshToken,
                    userId = body.user.id
                )
                AuthResult.Success(
                    User(
                        id = body.user.id,
                        phone = body.user.phone,
                        displayName = body.user.displayName,
                        avatarUrl = body.user.avatarUrl
                    )
                )
            } else {
                AuthResult.Error(
                    message = "Invalid verification code",
                    code = response.code()
                )
            }
        } catch (e: Exception) {
            AuthResult.Error(message = e.message ?: "Network error")
        }
    }

    suspend fun refreshTokens(): Boolean {
        return refreshMutex.withLock {
            try {
                val refreshToken = tokenManager.getRefreshToken() ?: return false
                val response = authApi.refreshToken(RefreshTokenRequest(refreshToken))
                if (response.isSuccessful) {
                    val body = response.body()!!
                    val userId = tokenManager.getUserId() ?: ""
                    tokenManager.saveTokens(
                        accessToken = body.accessToken,
                        refreshToken = body.refreshToken,
                        userId = userId
                    )
                    true
                } else {
                    if (response.code() == 401) {
                        tokenManager.clear()
                    }
                    false
                }
            } catch (e: Exception) {
                false
            }
        }
    }

    suspend fun logout() {
        try {
            authApi.logout()
        } catch (_: Exception) {
            // Best-effort server logout
        } finally {
            tokenManager.clear()
        }
    }
}
