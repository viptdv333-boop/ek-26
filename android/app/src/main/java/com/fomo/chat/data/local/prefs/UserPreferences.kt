package com.fomo.chat.data.local.prefs

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "user_preferences")

enum class AppTheme { SYSTEM, LIGHT, DARK }
enum class BubbleShape { ROUNDED, CLOUD, SHARP, IOS }
enum class FontSize { SMALL, MEDIUM, LARGE, EXTRA_LARGE }

data class UserPrefs(
    val theme: AppTheme = AppTheme.SYSTEM,
    val fontSize: FontSize = FontSize.MEDIUM,
    val bubbleShape: BubbleShape = BubbleShape.ROUNDED,
    val bubbleColor: String = "#007AFF",
    val wallpaper: String? = null
)

@Singleton
class UserPreferences @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val dataStore = context.dataStore

    private object Keys {
        val THEME = stringPreferencesKey("theme")
        val FONT_SIZE = stringPreferencesKey("font_size")
        val BUBBLE_SHAPE = stringPreferencesKey("bubble_shape")
        val BUBBLE_COLOR = stringPreferencesKey("bubble_color")
        val WALLPAPER = stringPreferencesKey("wallpaper")
    }

    val userPrefs: Flow<UserPrefs> = dataStore.data.map { prefs ->
        UserPrefs(
            theme = prefs[Keys.THEME]?.let { runCatching { AppTheme.valueOf(it) }.getOrNull() } ?: AppTheme.SYSTEM,
            fontSize = prefs[Keys.FONT_SIZE]?.let { runCatching { FontSize.valueOf(it) }.getOrNull() } ?: FontSize.MEDIUM,
            bubbleShape = prefs[Keys.BUBBLE_SHAPE]?.let { runCatching { BubbleShape.valueOf(it) }.getOrNull() } ?: BubbleShape.ROUNDED,
            bubbleColor = prefs[Keys.BUBBLE_COLOR] ?: "#007AFF",
            wallpaper = prefs[Keys.WALLPAPER]
        )
    }

    suspend fun setTheme(theme: AppTheme) {
        dataStore.edit { it[Keys.THEME] = theme.name }
    }

    suspend fun setFontSize(fontSize: FontSize) {
        dataStore.edit { it[Keys.FONT_SIZE] = fontSize.name }
    }

    suspend fun setBubbleShape(shape: BubbleShape) {
        dataStore.edit { it[Keys.BUBBLE_SHAPE] = shape.name }
    }

    suspend fun setBubbleColor(color: String) {
        dataStore.edit { it[Keys.BUBBLE_COLOR] = color }
    }

    suspend fun setWallpaper(wallpaper: String?) {
        dataStore.edit {
            if (wallpaper != null) {
                it[Keys.WALLPAPER] = wallpaper
            } else {
                it.remove(Keys.WALLPAPER)
            }
        }
    }

    suspend fun clear() {
        dataStore.edit { it.clear() }
    }
}
