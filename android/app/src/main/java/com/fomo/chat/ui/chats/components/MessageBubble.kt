package com.fomo.chat.ui.chats.components

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Done
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Forward
import androidx.compose.material.icons.filled.InsertDriveFile
import androidx.compose.material.icons.filled.Reply
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.fomo.chat.ui.chats.AttachmentType
import com.fomo.chat.ui.chats.ChatAttachment
import com.fomo.chat.ui.chats.ChatMessage
import com.fomo.chat.ui.chats.ChatReaction
import com.fomo.chat.ui.chats.MessageStatus
import com.fomo.chat.ui.theme.ErrorRed
import com.fomo.chat.ui.theme.OtherBubble
import com.fomo.chat.ui.theme.OwnBubble
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalFoundationApi::class, ExperimentalLayoutApi::class)
@Composable
fun MessageBubble(
    message: ChatMessage,
    showSenderName: Boolean = false,
    onReply: () -> Unit = {},
    onReaction: (String) -> Unit = {}
) {
    val configuration = LocalConfiguration.current
    val maxWidth = (configuration.screenWidthDp * 0.75f).dp
    val clipboardManager = LocalClipboardManager.current
    var showContextMenu by remember { mutableStateOf(false) }
    var showReactionPicker by remember { mutableStateOf(false) }

    val bubbleColor = if (message.isOwn) OwnBubble else OtherBubble
    val textColor = Color.White

    val bubbleShape = if (message.isOwn) {
        RoundedCornerShape(16.dp, 16.dp, 4.dp, 16.dp)
    } else {
        RoundedCornerShape(16.dp, 16.dp, 16.dp, 4.dp)
    }

    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (message.isOwn) Alignment.End else Alignment.Start
    ) {
        Box {
            Column(
                modifier = Modifier
                    .widthIn(max = maxWidth)
                    .clip(bubbleShape)
                    .background(bubbleColor)
                    .combinedClickable(
                        onClick = {},
                        onLongClick = { showContextMenu = true }
                    )
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                // Sender name in groups
                if (showSenderName && !message.isOwn) {
                    Text(
                        text = message.senderName,
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                }

                // Reply quote
                if (message.replyTo != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color.White.copy(alpha = 0.1f))
                            .padding(8.dp)
                    ) {
                        Column {
                            Text(
                                text = message.replyTo.senderName,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = message.replyTo.text,
                                style = MaterialTheme.typography.bodySmall,
                                color = textColor.copy(alpha = 0.7f),
                                maxLines = 2
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                }

                // Attachments
                if (message.attachments.isNotEmpty()) {
                    message.attachments.forEach { attachment ->
                        AttachmentView(attachment = attachment)
                        Spacer(modifier = Modifier.height(4.dp))
                    }
                }

                // Message text
                if (message.text.isNotBlank()) {
                    Text(
                        text = message.text,
                        style = MaterialTheme.typography.bodyMedium,
                        color = textColor
                    )
                }

                // Time and status
                Row(
                    modifier = Modifier.align(Alignment.End),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = formatMessageTime(message.timestamp),
                        style = MaterialTheme.typography.labelSmall,
                        color = textColor.copy(alpha = 0.6f)
                    )

                    if (message.isOwn) {
                        Icon(
                            imageVector = when (message.status) {
                                MessageStatus.SENDING -> Icons.Default.Schedule
                                MessageStatus.SENT -> Icons.Default.Done
                                MessageStatus.DELIVERED -> Icons.Default.DoneAll
                                MessageStatus.READ -> Icons.Default.DoneAll
                                MessageStatus.FAILED -> Icons.Default.Error
                            },
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = when (message.status) {
                                MessageStatus.READ -> MaterialTheme.colorScheme.primary
                                MessageStatus.FAILED -> ErrorRed
                                else -> textColor.copy(alpha = 0.6f)
                            }
                        )
                    }
                }
            }

            // Context menu
            DropdownMenu(
                expanded = showContextMenu,
                onDismissRequest = { showContextMenu = false }
            ) {
                DropdownMenuItem(
                    text = { Text("Ответить") },
                    onClick = {
                        showContextMenu = false
                        onReply()
                    },
                    leadingIcon = {
                        Icon(Icons.Default.Reply, contentDescription = null)
                    }
                )
                DropdownMenuItem(
                    text = { Text("Копировать") },
                    onClick = {
                        showContextMenu = false
                        clipboardManager.setText(AnnotatedString(message.text))
                    },
                    leadingIcon = {
                        Icon(Icons.Default.ContentCopy, contentDescription = null)
                    }
                )
                DropdownMenuItem(
                    text = { Text("Переслать") },
                    onClick = {
                        showContextMenu = false
                        // TODO: Forward message
                    },
                    leadingIcon = {
                        Icon(Icons.Default.Forward, contentDescription = null)
                    }
                )
                // Reaction quick picks
                DropdownMenuItem(
                    text = {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            listOf("\uD83D\uDC4D", "\u2764\uFE0F", "\uD83D\uDE02", "\uD83D\uDE22", "\uD83D\uDE31", "\uD83D\uDE4F").forEach { emoji ->
                                Text(
                                    text = emoji,
                                    style = MaterialTheme.typography.titleLarge,
                                    modifier = Modifier
                                        .clip(CircleShape)
                                        .combinedClickable(
                                            onClick = {
                                                showContextMenu = false
                                                onReaction(emoji)
                                            },
                                            onLongClick = {}
                                        )
                                )
                            }
                        }
                    },
                    onClick = {}
                )
            }
        }

        // Reactions row
        if (message.reactions.isNotEmpty()) {
            Spacer(modifier = Modifier.height(2.dp))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                modifier = Modifier.padding(horizontal = 4.dp)
            ) {
                val grouped = message.reactions.groupBy { it.emoji }
                grouped.forEach { (emoji, reactions) ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.surfaceVariant)
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(text = emoji, style = MaterialTheme.typography.bodySmall)
                            if (reactions.size > 1) {
                                Spacer(modifier = Modifier.width(2.dp))
                                Text(
                                    text = reactions.size.toString(),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AttachmentView(attachment: ChatAttachment) {
    when (attachment.type) {
        AttachmentType.IMAGE -> {
            AsyncImage(
                model = attachment.url,
                contentDescription = attachment.name,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp)),
                contentScale = ContentScale.FillWidth
            )
        }

        AttachmentType.VIDEO -> {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.Black.copy(alpha = 0.3f))
                    .padding(24.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "\u25B6 Видео",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White
                )
            }
        }

        AttachmentType.FILE, AttachmentType.AUDIO -> {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.White.copy(alpha = 0.1f))
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = Icons.Default.InsertDriveFile,
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Column {
                    Text(
                        text = attachment.name,
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White
                    )
                    if (attachment.size > 0) {
                        Text(
                            text = formatFileSize(attachment.size),
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White.copy(alpha = 0.6f)
                        )
                    }
                }
            }
        }
    }
}

private fun formatMessageTime(timestamp: Long): String {
    return SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(timestamp))
}

private fun formatFileSize(bytes: Long): String {
    return when {
        bytes < 1024 -> "$bytes B"
        bytes < 1024 * 1024 -> "${bytes / 1024} KB"
        else -> "${bytes / (1024 * 1024)} MB"
    }
}
