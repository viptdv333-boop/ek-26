package com.fomo.chat.data.remote.api

import com.fomo.chat.data.remote.dto.ContactDto
import com.fomo.chat.data.remote.dto.CreateContactRequest
import com.fomo.chat.data.remote.dto.UpdateContactRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path

interface ContactsApi {

    @GET("contacts")
    suspend fun getContacts(): Response<List<ContactDto>>

    @POST("contacts")
    suspend fun addContact(@Body request: CreateContactRequest): Response<ContactDto>

    @DELETE("contacts/{userId}")
    suspend fun removeContact(@Path("userId") userId: String): Response<Unit>

    @PATCH("contacts/{userId}")
    suspend fun updateContact(
        @Path("userId") userId: String,
        @Body request: UpdateContactRequest
    ): Response<ContactDto>
}
