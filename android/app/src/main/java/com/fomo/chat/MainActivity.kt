package com.fomo.chat

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fomo.chat.data.local.crypto.TokenManager
import com.fomo.chat.ui.navigation.AppNavigation
import com.fomo.chat.ui.navigation.Routes
import com.fomo.chat.ui.theme.FomoChatTheme
import dagger.hilt.android.AndroidEntryPoint
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Handle deep link from Telegram auth
        handleDeepLink(intent)

        setContent {
            FomoChatTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    val viewModel: MainViewModel = hiltViewModel()
                    val authState by viewModel.authState.collectAsState()

                    when (authState) {
                        is AuthState.Loading -> { /* splash */ }
                        is AuthState.Authenticated -> {
                            AppNavigation(startDestination = Routes.MAIN)
                        }
                        is AuthState.Unauthenticated -> {
                            AppNavigation(startDestination = Routes.AUTH_PHONE)
                        }
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        val uri = intent?.data ?: return
        if (uri.scheme == "fomochat" && uri.host == "auth") {
            val token = uri.getQueryParameter("token") ?: return
            val refreshToken = uri.getQueryParameter("refreshToken") ?: return
            val userId = uri.getQueryParameter("userId") ?: return
            val displayName = uri.getQueryParameter("displayName") ?: ""

            Log.d("MainActivity", "Telegram auth deep link received for user: $userId")

            // Save tokens via Hilt — we need to access TokenManager
            // This will be picked up by MainViewModel on next checkAuth()
            val app = application as FomoApp
            app.handleTelegramAuth(token, refreshToken, userId, displayName)
        }
    }
}

sealed class AuthState {
    data object Loading : AuthState()
    data object Authenticated : AuthState()
    data object Unauthenticated : AuthState()
}

@HiltViewModel
class MainViewModel @Inject constructor(
    private val tokenManager: TokenManager
) : ViewModel() {

    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    init {
        checkAuth()
    }

    fun checkAuth() {
        viewModelScope.launch {
            val token = tokenManager.getAccessToken()
            _authState.value = if (token != null) {
                AuthState.Authenticated
            } else {
                AuthState.Unauthenticated
            }
        }
    }

    fun onAuthenticated() {
        _authState.value = AuthState.Authenticated
    }

    fun onLoggedOut() {
        tokenManager.clear()
        _authState.value = AuthState.Unauthenticated
    }
}
