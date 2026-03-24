package com.fomo.chat

import android.app.Application
import com.fomo.chat.data.local.crypto.TokenManager
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class FomoApp : Application() {

    @Inject lateinit var tokenManager: TokenManager

    fun handleTelegramAuth(token: String, refreshToken: String, userId: String, displayName: String) {
        tokenManager.saveTokens(token, refreshToken, userId)
    }
}
