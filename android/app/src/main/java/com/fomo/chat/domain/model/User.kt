package com.fomo.chat.domain.model

data class User(
    val id: String,
    val phone: String,
    val displayName: String?,
    val avatarUrl: String?,
    val bio: String? = null,
    val lastSeenAt: String? = null,
    val isOnline: Boolean = false
)
