package com.fomo.chat.data.remote.dto

import com.google.gson.annotations.SerializedName

// --- Auth Request/Response DTOs ---

data class AuthRequestCodeRequest(
    @SerializedName("phone") val phone: String
)

data class AuthRequestCodeResponse(
    @SerializedName("success") val success: Boolean
)

data class AuthVerifyCodeRequest(
    @SerializedName("phone") val phone: String,
    @SerializedName("code") val code: String
)

data class AuthVerifyCodeResponse(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String,
    @SerializedName("user") val user: AuthUserDto
)

data class AuthUserDto(
    @SerializedName("id") val id: String,
    @SerializedName("phone") val phone: String,
    @SerializedName("displayName") val displayName: String?,
    @SerializedName("avatarUrl") val avatarUrl: String?,
    @SerializedName("isNewUser") val isNewUser: Boolean
)

data class RefreshTokenRequest(
    @SerializedName("refreshToken") val refreshToken: String
)

data class RefreshTokenResponse(
    @SerializedName("accessToken") val accessToken: String,
    @SerializedName("refreshToken") val refreshToken: String
)

data class PushTokenRequest(
    @SerializedName("token") val token: String,
    @SerializedName("platform") val platform: String = "android"
)
