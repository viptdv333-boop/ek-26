package com.fomo.chat.ui.navigation

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Contacts
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.Chat
import androidx.compose.material.icons.outlined.Contacts
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.fomo.chat.ui.auth.CodeVerifyScreen
import com.fomo.chat.ui.auth.PhoneInputScreen
import com.fomo.chat.ui.auth.ProfileSetupScreen
import com.fomo.chat.ui.calls.CallScreen
import com.fomo.chat.ui.chats.ChatListScreen
import com.fomo.chat.ui.chats.ChatRoomScreen
import com.fomo.chat.ui.contacts.ContactsScreen
import com.fomo.chat.ui.settings.SettingsScreen

object Routes {
    const val AUTH_PHONE = "auth/phone"
    const val AUTH_CODE = "auth/code/{phone}"
    const val AUTH_PROFILE = "auth/profile"
    const val MAIN = "main"
    const val CHAT_ROOM = "chat/{conversationId}"
    const val CALL = "call/{callId}"

    fun authCode(phone: String) = "auth/code/$phone"
    fun chatRoom(conversationId: String) = "chat/$conversationId"
    fun call(callId: String) = "call/$callId"
}

sealed class BottomNavTab(
    val route: String,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector
) {
    data object Chats : BottomNavTab("main/chats", "Чаты", Icons.Filled.Chat, Icons.Outlined.Chat)
    data object Contacts : BottomNavTab("main/contacts", "Контакты", Icons.Filled.Contacts, Icons.Outlined.Contacts)
    data object Settings : BottomNavTab("main/settings", "Настройки", Icons.Filled.Settings, Icons.Outlined.Settings)
}

private val bottomNavTabs = listOf(
    BottomNavTab.Chats,
    BottomNavTab.Contacts,
    BottomNavTab.Settings
)

@Composable
fun AppNavigation(
    startDestination: String = Routes.AUTH_PHONE,
    navController: NavHostController = rememberNavController()
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        enterTransition = {
            slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Left, tween(300)) + fadeIn(tween(300))
        },
        exitTransition = {
            slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Left, tween(300)) + fadeOut(tween(300))
        },
        popEnterTransition = {
            slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Right, tween(300)) + fadeIn(tween(300))
        },
        popExitTransition = {
            slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Right, tween(300)) + fadeOut(tween(300))
        }
    ) {
        // Auth flow
        composable(Routes.AUTH_PHONE) {
            PhoneInputScreen(
                onCodeSent = { phone ->
                    navController.navigate(Routes.authCode(phone))
                }
            )
        }

        composable(
            route = Routes.AUTH_CODE,
            arguments = listOf(navArgument("phone") { type = NavType.StringType })
        ) { backStackEntry ->
            val phone = backStackEntry.arguments?.getString("phone") ?: ""
            CodeVerifyScreen(
                phone = phone,
                onVerified = { isNewUser ->
                    if (isNewUser) {
                        navController.navigate(Routes.AUTH_PROFILE) {
                            popUpTo(Routes.AUTH_PHONE) { inclusive = true }
                        }
                    } else {
                        navController.navigate(Routes.MAIN) {
                            popUpTo(Routes.AUTH_PHONE) { inclusive = true }
                        }
                    }
                },
                onBack = { navController.popBackStack() }
            )
        }

        composable(Routes.AUTH_PROFILE) {
            ProfileSetupScreen(
                onComplete = {
                    navController.navigate(Routes.MAIN) {
                        popUpTo(Routes.AUTH_PROFILE) { inclusive = true }
                    }
                }
            )
        }

        // Main screen with bottom nav
        composable(Routes.MAIN) {
            MainScreen(
                onOpenChat = { conversationId ->
                    navController.navigate(Routes.chatRoom(conversationId))
                },
                onOpenCall = { callId ->
                    navController.navigate(Routes.call(callId))
                }
            )
        }

        // Chat room
        composable(
            route = Routes.CHAT_ROOM,
            arguments = listOf(navArgument("conversationId") { type = NavType.StringType })
        ) { backStackEntry ->
            val conversationId = backStackEntry.arguments?.getString("conversationId") ?: ""
            ChatRoomScreen(
                conversationId = conversationId,
                onBack = { navController.popBackStack() },
                onCallClick = { callId ->
                    navController.navigate(Routes.call(callId))
                }
            )
        }

        // Call screen
        composable(
            route = Routes.CALL,
            arguments = listOf(navArgument("callId") { type = NavType.StringType })
        ) { backStackEntry ->
            val callId = backStackEntry.arguments?.getString("callId") ?: ""
            CallScreen(
                callId = callId,
                onEnd = { navController.popBackStack() }
            )
        }
    }
}

@Composable
fun MainScreen(
    onOpenChat: (String) -> Unit,
    onOpenCall: (String) -> Unit
) {
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = navBackStackEntry?.destination

    Scaffold(
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                contentColor = MaterialTheme.colorScheme.onSurface
            ) {
                bottomNavTabs.forEach { tab ->
                    val selected = currentDestination?.hierarchy?.any { it.route == tab.route } == true
                    NavigationBarItem(
                        selected = selected,
                        onClick = {
                            navController.navigate(tab.route) {
                                popUpTo(navController.graph.findStartDestination().id) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = {
                            Icon(
                                imageVector = if (selected) tab.selectedIcon else tab.unselectedIcon,
                                contentDescription = tab.label
                            )
                        },
                        label = { Text(tab.label, style = MaterialTheme.typography.labelSmall) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.primary,
                            selectedTextColor = MaterialTheme.colorScheme.primary,
                            unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            indicatorColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                        )
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = BottomNavTab.Chats.route,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            composable(BottomNavTab.Chats.route) {
                ChatListScreen(onChatClick = onOpenChat)
            }
            composable(BottomNavTab.Contacts.route) {
                ContactsScreen(onContactClick = onOpenChat)
            }
            composable(BottomNavTab.Settings.route) {
                SettingsScreen()
            }
        }
    }
}
