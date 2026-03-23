package com.fomo.chat.data.local.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "contacts")
data class ContactEntity(
    @PrimaryKey val userId: String,
    val displayName: String?,
    val avatarUrl: String?,
    val phone: String?,
    val nickname: String?,
    val note: String?,
    val isFavorite: Boolean,
    val isOnline: Boolean,
    val lastSeenAt: String?
)
