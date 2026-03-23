package com.fomo.chat.data.remote.api

import com.fomo.chat.data.remote.dto.UploadResponse
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part

interface UploadApi {

    @Multipart
    @POST("uploads")
    suspend fun upload(@Part file: MultipartBody.Part): Response<UploadResponse>
}
