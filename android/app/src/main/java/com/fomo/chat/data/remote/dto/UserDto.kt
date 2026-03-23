package com.fomo.chat.data.remote.dto

import com.google.gson.annotations.SerializedName

data class UserDto(
    @SerializedName("id") val id: String,
    @SerializedName("phone") val phone: String,
    @SerializedName("displayName") val displayName: String?,
    @SerializedName("avatarUrl") val avatarUrl: String?,
    @SerializedName("bio") val bio: String?,
    @SerializedName("lastSeenAt") val lastSeenAt: String?,
    @SerializedName("isOnline") val isOnline: Boolean?,
    @SerializedName("createdAt") val createdAt: String?
)
