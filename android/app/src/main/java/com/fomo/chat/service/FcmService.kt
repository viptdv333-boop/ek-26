package com.fomo.chat.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.fomo.chat.MainActivity
import com.fomo.chat.R
import com.fomo.chat.data.local.crypto.TokenManager
import com.fomo.chat.data.remote.api.UsersApi
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class FcmService : FirebaseMessagingService() {

    @Inject lateinit var usersApi: UsersApi
    @Inject lateinit var tokenManager: TokenManager

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        if (tokenManager.getAccessToken() != null) {
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    usersApi.registerPushToken(mapOf("token" to token, "platform" to "fcm"))
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val title = message.data["title"] ?: message.notification?.title ?: "FOMO Chat"
        val body = message.data["body"] ?: message.notification?.body ?: ""
        val conversationId = message.data["conversationId"]

        createNotificationChannel()

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            conversationId?.let { putExtra("conversationId", it) }
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_MESSAGES)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setGroup(conversationId ?: "messages")
            .build()

        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_MESSAGES, "Сообщения",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Уведомления о новых сообщениях"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    companion object {
        const val CHANNEL_MESSAGES = "messages"
    }
}
