package com.fomo.chat.data.repository

import com.fomo.chat.data.local.db.dao.ContactDao
import com.fomo.chat.data.local.db.entity.ContactEntity
import com.fomo.chat.data.remote.api.ContactsApi
import com.fomo.chat.data.remote.dto.CreateContactRequest
import com.fomo.chat.data.remote.dto.UpdateContactRequest
import com.fomo.chat.domain.model.Contact
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ContactRepository @Inject constructor(
    private val contactsApi: ContactsApi,
    private val contactDao: ContactDao
) {

    fun observeContacts(): Flow<List<Contact>> {
        return contactDao.observeAll().map { entities ->
            entities.map { it.toDomain() }
        }
    }

    fun observeFavorites(): Flow<List<Contact>> {
        return contactDao.observeFavorites().map { entities ->
            entities.map { it.toDomain() }
        }
    }

    suspend fun refreshContacts(): Result<List<Contact>> {
        return try {
            val response = contactsApi.getContacts()
            if (response.isSuccessful) {
                val dtos = response.body() ?: emptyList()
                val entities = dtos.map { dto ->
                    ContactEntity(
                        userId = dto.userId,
                        displayName = dto.displayName,
                        avatarUrl = dto.avatarUrl,
                        phone = dto.phone,
                        nickname = dto.nickname,
                        note = dto.note,
                        isFavorite = dto.isFavorite ?: false,
                        isOnline = dto.isOnline ?: false,
                        lastSeenAt = dto.lastSeenAt
                    )
                }
                contactDao.upsertAll(entities)
                Result.success(entities.map { it.toDomain() })
            } else {
                Result.failure(Exception("Failed to fetch contacts: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun addContact(contactUserId: String, nickname: String? = null): Result<Contact> {
        return try {
            val response = contactsApi.addContact(CreateContactRequest(contactUserId, nickname))
            if (response.isSuccessful) {
                val dto = response.body()!!
                val entity = ContactEntity(
                    userId = dto.userId,
                    displayName = dto.displayName,
                    avatarUrl = dto.avatarUrl,
                    phone = dto.phone,
                    nickname = dto.nickname,
                    note = dto.note,
                    isFavorite = dto.isFavorite ?: false,
                    isOnline = dto.isOnline ?: false,
                    lastSeenAt = dto.lastSeenAt
                )
                contactDao.upsert(entity)
                Result.success(entity.toDomain())
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun removeContact(userId: String): Result<Unit> {
        return try {
            val response = contactsApi.removeContact(userId)
            if (response.isSuccessful) {
                contactDao.deleteByUserId(userId)
                Result.success(Unit)
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateContact(
        userId: String,
        nickname: String? = null,
        note: String? = null,
        isFavorite: Boolean? = null
    ): Result<Contact> {
        return try {
            val response = contactsApi.updateContact(
                userId,
                UpdateContactRequest(nickname, note, isFavorite)
            )
            if (response.isSuccessful) {
                val dto = response.body()!!
                val entity = ContactEntity(
                    userId = dto.userId,
                    displayName = dto.displayName,
                    avatarUrl = dto.avatarUrl,
                    phone = dto.phone,
                    nickname = dto.nickname,
                    note = dto.note,
                    isFavorite = dto.isFavorite ?: false,
                    isOnline = dto.isOnline ?: false,
                    lastSeenAt = dto.lastSeenAt
                )
                contactDao.upsert(entity)
                Result.success(entity.toDomain())
            } else {
                Result.failure(Exception("Failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun clearAllData() {
        contactDao.deleteAll()
    }

    private fun ContactEntity.toDomain(): Contact {
        return Contact(
            userId = userId,
            displayName = displayName,
            avatarUrl = avatarUrl,
            phone = phone,
            nickname = nickname,
            note = note,
            isFavorite = isFavorite,
            isOnline = isOnline,
            lastSeenAt = lastSeenAt
        )
    }
}
