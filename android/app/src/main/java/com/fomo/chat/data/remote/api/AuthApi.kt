package com.fomo.chat.data.remote.api

import com.fomo.chat.data.remote.dto.AuthRequestCodeRequest
import com.fomo.chat.data.remote.dto.AuthRequestCodeResponse
import com.fomo.chat.data.remote.dto.AuthVerifyCodeRequest
import com.fomo.chat.data.remote.dto.AuthVerifyCodeResponse
import com.fomo.chat.data.remote.dto.RefreshTokenRequest
import com.fomo.chat.data.remote.dto.RefreshTokenResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface AuthApi {

    @POST("auth/request-code")
    suspend fun requestCode(@Body request: AuthRequestCodeRequest): Response<AuthRequestCodeResponse>

    @POST("auth/verify-code")
    suspend fun verifyCode(@Body request: AuthVerifyCodeRequest): Response<AuthVerifyCodeResponse>

    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequest): Response<RefreshTokenResponse>

    @POST("auth/logout")
    suspend fun logout(): Response<Unit>
}
