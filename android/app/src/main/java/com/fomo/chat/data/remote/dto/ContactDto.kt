package com.fomo.chat.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ContactDto(
    @SerializedName("userId") val userId: String,
    @SerializedName("displayName") val displayName: String?,
    @SerializedName("avatarUrl") val avatarUrl: String?,
    @SerializedName("phone") val phone: String?,
    @SerializedName("nickname") val nickname: String?,
    @SerializedName("note") val note: String?,
    @SerializedName("isFavorite") val isFavorite: Boolean?,
    @SerializedName("isOnline") val isOnline: Boolean?,
    @SerializedName("lastSeenAt") val lastSeenAt: String?,
    @SerializedName("createdAt") val createdAt: String?
)

data class CreateContactRequest(
    @SerializedName("contactUserId") val contactUserId: String,
    @SerializedName("nickname") val nickname: String? = null
)

data class UpdateContactRequest(
    @SerializedName("nickname") val nickname: String? = null,
    @SerializedName("note") val note: String? = null,
    @SerializedName("isFavorite") val isFavorite: Boolean? = null
)
