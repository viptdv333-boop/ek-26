package com.fomo.chat.data.remote.api

import com.fomo.chat.data.remote.dto.PushTokenRequest
import com.fomo.chat.data.remote.dto.UserDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Query

interface UsersApi {

    @GET("users/me")
    suspend fun getMe(): Response<UserDto>

    @PATCH("users/me")
    suspend fun updateMe(@Body updates: Map<String, @JvmSuppressWildcards Any?>): Response<UserDto>

    @GET("users/search")
    suspend fun searchUsers(@Query("q") query: String): Response<List<UserDto>>

    @POST("users/me/push-token")
    suspend fun registerPushToken(@Body request: PushTokenRequest): Response<Unit>
}
