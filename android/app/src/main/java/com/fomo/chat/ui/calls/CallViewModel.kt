package com.fomo.chat.ui.calls

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class CallState {
    RINGING,
    CONNECTING,
    ACTIVE,
    ENDED
}

data class CallUiState(
    val callId: String = "",
    val peerName: String = "",
    val peerAvatarUrl: String? = null,
    val callState: CallState = CallState.RINGING,
    val isVideoCall: Boolean = false,
    val isMuted: Boolean = false,
    val isSpeakerOn: Boolean = false,
    val isCameraOn: Boolean = false,
    val durationSeconds: Int = 0,
    val statusText: String = "Вызов..."
)

@HiltViewModel
class CallViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val callId: String = savedStateHandle["callId"] ?: ""

    private val _uiState = MutableStateFlow(
        CallUiState(
            callId = callId,
            isVideoCall = callId.startsWith("video_")
        )
    )
    val uiState: StateFlow<CallUiState> = _uiState.asStateFlow()

    private var timerJob: Job? = null

    init {
        loadCallInfo()
        simulateCallFlow()
    }

    private fun loadCallInfo() {
        // TODO: Replace with actual call info
        _uiState.update {
            it.copy(
                peerName = "Алексей Петров",
                isCameraOn = it.isVideoCall
            )
        }
    }

    private fun simulateCallFlow() {
        viewModelScope.launch {
            // Ringing
            _uiState.update { it.copy(callState = CallState.RINGING, statusText = "Вызов...") }
            delay(2000)

            // Connecting
            _uiState.update { it.copy(callState = CallState.CONNECTING, statusText = "Соединение...") }
            delay(1000)

            // Active
            _uiState.update { it.copy(callState = CallState.ACTIVE, statusText = "00:00") }
            startTimer()
        }
    }

    private fun startTimer() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (true) {
                delay(1000)
                _uiState.update { state ->
                    val seconds = state.durationSeconds + 1
                    val minutes = seconds / 60
                    val secs = seconds % 60
                    state.copy(
                        durationSeconds = seconds,
                        statusText = String.format("%02d:%02d", minutes, secs)
                    )
                }
            }
        }
    }

    fun toggleMute() {
        _uiState.update { it.copy(isMuted = !it.isMuted) }
        // TODO: Mute/unmute audio via WebRTC
    }

    fun toggleSpeaker() {
        _uiState.update { it.copy(isSpeakerOn = !it.isSpeakerOn) }
        // TODO: Toggle speaker via audio manager
    }

    fun toggleCamera() {
        _uiState.update { it.copy(isCameraOn = !it.isCameraOn) }
        // TODO: Toggle camera via WebRTC
    }

    fun endCall() {
        timerJob?.cancel()
        _uiState.update {
            it.copy(
                callState = CallState.ENDED,
                statusText = "Завершён"
            )
        }
        // TODO: End call via WebRTC / API
    }

    override fun onCleared() {
        super.onCleared()
        timerJob?.cancel()
    }
}
