package com.fomo.chat.domain.model

data class Contact(
    val userId: String,
    val displayName: String?,
    val avatarUrl: String?,
    val phone: String?,
    val nickname: String?,
    val note: String?,
    val isFavorite: Boolean,
    val isOnline: Boolean,
    val lastSeenAt: String?
)
