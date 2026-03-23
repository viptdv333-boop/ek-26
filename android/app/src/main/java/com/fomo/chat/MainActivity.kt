package com.fomo.chat

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.fomo.chat.data.local.crypto.TokenManager
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
            MaterialTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    FomoNavGraph()
                }
            }
        }
    }
}

sealed class Screen(val route: String) {
    data object Auth : Screen("auth")
    data object Main : Screen("main")
    data object Chat : Screen("chat/{conversationId}") {
        fun createRoute(conversationId: String) = "chat/$conversationId"
    }
    data object Settings : Screen("settings")
    data object Contacts : Screen("contacts")
    data object NewChat : Screen("new_chat")
    data object Profile : Screen("profile")
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

@Composable
fun FomoNavGraph(
    viewModel: MainViewModel = hiltViewModel()
) {
    val authState by viewModel.authState.collectAsState()
    val navController = rememberNavController()

    when (authState) {
        is AuthState.Loading -> {
            // Splash / loading state handled by compose
        }
        is AuthState.Authenticated, is AuthState.Unauthenticated -> {
            val startDestination = if (authState is AuthState.Authenticated) {
                Screen.Main.route
            } else {
                Screen.Auth.route
            }

            NavHost(
                navController = navController,
                startDestination = startDestination
            ) {
                composable(Screen.Auth.route) {
                    // Auth screen placeholder — will be implemented in UI layer
                    // On success: viewModel.onAuthenticated(); navController.navigate(Screen.Main.route)
                }
                composable(Screen.Main.route) {
                    // Main screen (conversation list) — will be implemented in UI layer
                }
                composable(Screen.Chat.route) { backStackEntry ->
                    val conversationId = backStackEntry.arguments?.getString("conversationId") ?: return@composable
                    // Chat screen — will be implemented in UI layer
                }
                composable(Screen.Settings.route) {
                    // Settings screen — will be implemented in UI layer
                }
                composable(Screen.Contacts.route) {
                    // Contacts screen — will be implemented in UI layer
                }
                composable(Screen.NewChat.route) {
                    // New chat screen — will be implemented in UI layer
                }
                composable(Screen.Profile.route) {
                    // Profile screen — will be implemented in UI layer
                }
            }
        }
    }
}
