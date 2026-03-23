package com.fomo.chat.data.remote.api

import com.fomo.chat.data.remote.dto.ArchiveResponse
import com.fomo.chat.data.remote.dto.ConversationDto
import com.fomo.chat.data.remote.dto.CreateDirectRequest
import com.fomo.chat.data.remote.dto.CreateGroupRequest
import com.fomo.chat.data.remote.dto.CreateGroupResponse
import com.fomo.chat.data.remote.dto.CreateMessageRequest
import com.fomo.chat.data.remote.dto.MessageDto
import com.fomo.chat.data.remote.dto.MuteResponse
import com.fomo.chat.data.remote.dto.PinMessageRequest
import com.fomo.chat.data.remote.dto.PinnedMessagesResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ConversationsApi {

    @GET("conversations")
    suspend fun getConversations(
        @Query("cursor") cursor: String? = null,
        @Query("limit") limit: Int? = null
    ): Response<List<ConversationDto>>

    @POST("conversations/direct")
    suspend fun createDirect(@Body request: CreateDirectRequest): Response<ConversationDto>

    @POST("conversations/group")
    suspend fun createGroup(@Body request: CreateGroupRequest): Response<CreateGroupResponse>

    @GET("conversations/{id}")
    suspend fun getConversation(@Path("id") id: String): Response<ConversationDto>

    @DELETE("conversations/{id}")
    suspend fun deleteConversation(@Path("id") id: String): Response<Unit>

    @GET("conversations/{id}/messages")
    suspend fun getMessages(
        @Path("id") conversationId: String,
        @Query("cursor") cursor: String? = null,
        @Query("limit") limit: Int? = null
    ): Response<List<MessageDto>>

    @POST("conversations/{id}/messages")
    suspend fun sendMessage(
        @Path("id") conversationId: String,
        @Body request: CreateMessageRequest
    ): Response<MessageDto>

    @PATCH("conversations/{id}/mute")
    suspend fun toggleMute(@Path("id") id: String): Response<MuteResponse>

    @PATCH("conversations/{id}/archive")
    suspend fun toggleArchive(@Path("id") id: String): Response<ArchiveResponse>

    @GET("conversations/{id}/pin")
    suspend fun getPinnedMessages(@Path("id") id: String): Response<PinnedMessagesResponse>

    @POST("conversations/{id}/pin")
    suspend fun pinMessage(
        @Path("id") id: String,
        @Body request: PinMessageRequest
    ): Response<Unit>

    @DELETE("conversations/{id}/pin/{messageId}")
    suspend fun unpinMessage(
        @Path("id") id: String,
        @Path("messageId") messageId: String
    ): Response<Unit>
}
