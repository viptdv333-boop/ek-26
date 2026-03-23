package com.fomo.chat

import android.os.Bundle
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

    private fun checkAuth() {
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
