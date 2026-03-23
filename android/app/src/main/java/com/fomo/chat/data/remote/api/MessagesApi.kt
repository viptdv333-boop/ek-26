package com.fomo.chat.data.remote.api

import com.fomo.chat.data.remote.dto.EditMessageRequest
import com.fomo.chat.data.remote.dto.EditMessageResponse
import com.fomo.chat.data.remote.dto.ReactionRequest
import com.fomo.chat.data.remote.dto.ReactionResponse
import com.fomo.chat.data.remote.dto.SearchMessagesResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface MessagesApi {

    @PATCH("messages/{id}/edit")
    suspend fun editMessage(
        @Path("id") messageId: String,
        @Body request: EditMessageRequest
    ): Response<EditMessageResponse>

    @DELETE("messages/{id}")
    suspend fun deleteMessage(@Path("id") messageId: String): Response<Unit>

    @POST("messages/{id}/reactions")
    suspend fun addReaction(
        @Path("id") messageId: String,
        @Body request: ReactionRequest
    ): Response<ReactionResponse>

    @GET("messages/search")
    suspend fun searchMessages(@Query("q") query: String): Response<SearchMessagesResponse>
}
