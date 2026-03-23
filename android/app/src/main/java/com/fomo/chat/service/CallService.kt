package com.fomo.chat.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.fomo.chat.MainActivity
import com.fomo.chat.R
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class CallService : Service() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val callerName = intent?.getStringExtra("callerName") ?: "Звонок"
        val callType = intent?.getStringExtra("callType") ?: "audio"
        val isIncoming = intent?.getBooleanExtra("isIncoming", false) ?: false

        val title = if (isIncoming) "Входящий звонок" else "Исходящий звонок"
        val text = "$callerName — ${if (callType == "video") "Видео" else "Аудио"}"

        startForeground(NOTIFICATION_ID, buildNotification(title, text))
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildNotification(title: String, text: String): Notification {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_notification)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .addAction(R.drawable.ic_notification, "Завершить", null)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, "Звонки",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Уведомления о звонках"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    companion object {
        private const val CHANNEL_ID = "calls"
        private const val NOTIFICATION_ID = 2001
    }
}
