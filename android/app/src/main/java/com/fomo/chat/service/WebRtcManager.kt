package com.fomo.chat.service

import android.content.Context
import com.fomo.chat.data.remote.WebSocketClient
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import org.webrtc.*
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

enum class CallState { IDLE, RINGING, CONNECTING, CONNECTED, ENDED }

data class CallInfo(
    val callId: String,
    val peerId: String,
    val peerName: String,
    val peerAvatar: String? = null,
    val type: String = "audio", // audio | video
    val direction: String = "outgoing", // outgoing | incoming
    val state: CallState = CallState.IDLE,
    val startedAt: Long? = null
)

@Singleton
class WebRtcManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val webSocketClient: WebSocketClient
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private var peerConnectionFactory: PeerConnectionFactory? = null
    private var peerConnection: PeerConnection? = null
    private var localAudioTrack: AudioTrack? = null
    private var localVideoTrack: VideoTrack? = null
    private var localVideoSource: VideoSource? = null
    private var videoCapturer: CameraVideoCapturer? = null
    private val bufferedCandidates = mutableListOf<IceCandidate>()
    private var remoteDescriptionSet = false

    private val _callInfo = MutableStateFlow<CallInfo?>(null)
    val callInfo: StateFlow<CallInfo?> = _callInfo

    private val _isMuted = MutableStateFlow(false)
    val isMuted: StateFlow<Boolean> = _isMuted

    private val _isCameraOff = MutableStateFlow(false)
    val isCameraOff: StateFlow<Boolean> = _isCameraOff

    private val _remoteVideoTrack = MutableStateFlow<VideoTrack?>(null)
    val remoteVideoTrack: StateFlow<VideoTrack?> = _remoteVideoTrack

    private val _localVideoTrack2 = MutableStateFlow<VideoTrack?>(null)
    val localVideoTrackFlow: StateFlow<VideoTrack?> = _localVideoTrack2

    private val iceServers = listOf(
        PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("turn:85.198.82.136:3478")
            .setUsername("fomo")
            .setPassword("fomo2024")
            .createIceServer(),
        PeerConnection.IceServer.builder("turn:85.198.82.136:3478?transport=tcp")
            .setUsername("fomo")
            .setPassword("fomo2024")
            .createIceServer()
    )

    init {
        initFactory()
        observeWebSocketEvents()
    }

    private fun initFactory() {
        PeerConnectionFactory.initialize(
            PeerConnectionFactory.InitializationOptions.builder(context)
                .setEnableInternalTracer(false)
                .createInitializationOptions()
        )
        peerConnectionFactory = PeerConnectionFactory.builder()
            .setAudioDeviceModule(
                org.webrtc.audio.JavaAudioDeviceModule.builder(context)
                    .createAudioDeviceModule()
            )
            .createPeerConnectionFactory()
    }

    private fun observeWebSocketEvents() {
        scope.launch {
            webSocketClient.events.collect { event ->
                when (event.event) {
                    "call:incoming" -> handleIncomingCall(event.data)
                    "call:answer" -> handleAnswer(event.data)
                    "call:ice" -> handleIceCandidate(event.data)
                    "call:end" -> handleCallEnd()
                    "call:decline" -> handleCallEnd()
                    "call:busy" -> handleCallEnd()
                }
            }
        }
    }

    fun startCall(peerId: String, peerName: String, peerAvatar: String?, type: String) {
        val callId = UUID.randomUUID().toString()
        _callInfo.value = CallInfo(callId, peerId, peerName, peerAvatar, type, "outgoing", CallState.RINGING)

        createPeerConnection()
        addLocalMedia(type == "video")

        scope.launch {
            val offer = createOffer()
            peerConnection?.setLocalDescription(SdpObserverAdapter(), offer)
            webSocketClient.send("call:offer", mapOf(
                "targetUserId" to peerId,
                "callId" to callId,
                "type" to type,
                "offer" to mapOf("type" to offer.type.canonicalForm(), "sdp" to offer.description)
            ))
        }
    }

    fun acceptCall() {
        val info = _callInfo.value ?: return
        _callInfo.value = info.copy(state = CallState.CONNECTING)
        // answer is created in handleIncomingCall flow
    }

    fun endCall() {
        val info = _callInfo.value
        if (info != null) {
            webSocketClient.send("call:end", mapOf(
                "targetUserId" to info.peerId,
                "callId" to info.callId,
                "reason" to "hangup"
            ))
        }
        cleanup()
    }

    fun declineCall() {
        val info = _callInfo.value
        if (info != null) {
            webSocketClient.send("call:decline", mapOf(
                "callerId" to info.peerId,
                "callId" to info.callId
            ))
        }
        cleanup()
    }

    fun toggleMute() {
        _isMuted.value = !_isMuted.value
        localAudioTrack?.setEnabled(!_isMuted.value)
    }

    fun toggleCamera() {
        _isCameraOff.value = !_isCameraOff.value
        localVideoTrack?.setEnabled(!_isCameraOff.value)
    }

    private fun handleIncomingCall(data: Map<String, Any?>) {
        val callId = data["callId"] as? String ?: return
        val callerId = data["callerId"] as? String ?: return
        val callerName = data["callerName"] as? String ?: ""
        val callerAvatar = data["callerAvatar"] as? String
        val type = data["type"] as? String ?: "audio"
        val offerMap = data["offer"] as? Map<*, *> ?: return

        _callInfo.value = CallInfo(callId, callerId, callerName, callerAvatar, type, "incoming", CallState.RINGING)

        createPeerConnection()
        addLocalMedia(type == "video")

        val offer = SessionDescription(
            SessionDescription.Type.OFFER,
            offerMap["sdp"] as? String ?: return
        )

        scope.launch {
            peerConnection?.setRemoteDescription(SdpObserverAdapter(), offer)
            remoteDescriptionSet = true
            flushCandidates()

            val answer = createAnswer()
            peerConnection?.setLocalDescription(SdpObserverAdapter(), answer)
            _callInfo.value = _callInfo.value?.copy(state = CallState.CONNECTING)

            webSocketClient.send("call:answer", mapOf(
                "callerId" to callerId,
                "callId" to callId,
                "answer" to mapOf("type" to answer.type.canonicalForm(), "sdp" to answer.description)
            ))
        }
    }

    private fun handleAnswer(data: Map<String, Any?>) {
        val answerMap = data["answer"] as? Map<*, *> ?: return
        val answer = SessionDescription(
            SessionDescription.Type.ANSWER,
            answerMap["sdp"] as? String ?: return
        )
        peerConnection?.setRemoteDescription(SdpObserverAdapter(), answer)
        remoteDescriptionSet = true
        _callInfo.value = _callInfo.value?.copy(state = CallState.CONNECTING)
        flushCandidates()
    }

    private fun handleIceCandidate(data: Map<String, Any?>) {
        val candidateMap = data["candidate"] as? Map<*, *> ?: return
        val candidate = IceCandidate(
            candidateMap["sdpMid"] as? String ?: "",
            (candidateMap["sdpMLineIndex"] as? Number)?.toInt() ?: 0,
            candidateMap["candidate"] as? String ?: return
        )
        if (remoteDescriptionSet) {
            peerConnection?.addIceCandidate(candidate)
        } else {
            bufferedCandidates.add(candidate)
        }
    }

    private fun flushCandidates() {
        bufferedCandidates.forEach { peerConnection?.addIceCandidate(it) }
        bufferedCandidates.clear()
    }

    private fun handleCallEnd() {
        cleanup()
    }

    private fun createPeerConnection() {
        val config = PeerConnection.RTCConfiguration(iceServers).apply {
            sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
            iceTransportsType = PeerConnection.IceTransportsType.ALL
        }

        peerConnection = peerConnectionFactory?.createPeerConnection(config, object : PeerConnection.Observer {
            override fun onIceCandidate(candidate: IceCandidate?) {
                candidate?.let {
                    val info = _callInfo.value ?: return
                    webSocketClient.send("call:ice", mapOf(
                        "targetUserId" to info.peerId,
                        "callId" to info.callId,
                        "candidate" to mapOf(
                            "candidate" to it.sdp,
                            "sdpMid" to it.sdpMid,
                            "sdpMLineIndex" to it.sdpMLineIndex
                        )
                    ))
                }
            }

            override fun onConnectionChange(newState: PeerConnection.PeerConnectionState?) {
                when (newState) {
                    PeerConnection.PeerConnectionState.CONNECTED -> {
                        _callInfo.value = _callInfo.value?.copy(
                            state = CallState.CONNECTED,
                            startedAt = System.currentTimeMillis()
                        )
                    }
                    PeerConnection.PeerConnectionState.FAILED,
                    PeerConnection.PeerConnectionState.CLOSED -> cleanup()
                    PeerConnection.PeerConnectionState.DISCONNECTED -> {
                        // Wait 5s before ending (mobile resilience)
                        scope.launch {
                            kotlinx.coroutines.delay(5000)
                            if (_callInfo.value?.state == CallState.CONNECTED) {
                                // Still disconnected after 5s
                            }
                        }
                    }
                    else -> {}
                }
            }

            override fun onAddTrack(receiver: RtpReceiver?, streams: Array<out MediaStream>?) {
                receiver?.track()?.let { track ->
                    if (track is VideoTrack) {
                        _remoteVideoTrack.value = track
                    }
                }
            }

            override fun onSignalingChange(state: PeerConnection.SignalingState?) {}
            override fun onIceConnectionChange(state: PeerConnection.IceConnectionState?) {}
            override fun onIceConnectionReceivingChange(receiving: Boolean) {}
            override fun onIceGatheringChange(state: PeerConnection.IceGatheringState?) {}
            override fun onIceCandidatesRemoved(candidates: Array<out IceCandidate>?) {}
            override fun onRemoveStream(stream: MediaStream?) {}
            override fun onDataChannel(channel: DataChannel?) {}
            override fun onRenegotiationNeeded() {}
            override fun onAddStream(stream: MediaStream?) {}
            override fun onTrack(transceiver: RtpTransceiver?) {}
        })
    }

    private fun addLocalMedia(withVideo: Boolean) {
        val factory = peerConnectionFactory ?: return
        val pc = peerConnection ?: return

        // Audio
        val audioSource = factory.createAudioSource(MediaConstraints())
        localAudioTrack = factory.createAudioTrack("audio0", audioSource)
        pc.addTrack(localAudioTrack, listOf("stream0"))

        // Video (if needed)
        if (withVideo) {
            val enumerator = Camera2Enumerator(context)
            val frontCamera = enumerator.deviceNames.firstOrNull { enumerator.isFrontFacing(it) }
            if (frontCamera != null) {
                videoCapturer = enumerator.createCapturer(frontCamera, null)
                val surfaceHelper = SurfaceTextureHelper.create("CaptureThread", EglBase.create().eglBaseContext)
                localVideoSource = factory.createVideoSource(false)
                videoCapturer?.initialize(surfaceHelper, context, localVideoSource?.capturerObserver)
                videoCapturer?.startCapture(640, 480, 30)
                localVideoTrack = factory.createVideoTrack("video0", localVideoSource)
                pc.addTrack(localVideoTrack, listOf("stream0"))
                _localVideoTrack2.value = localVideoTrack
            }
        }
    }

    private suspend fun createOffer(): SessionDescription {
        return kotlinx.coroutines.suspendCancellableCoroutine { cont ->
            peerConnection?.createOffer(object : SdpObserver {
                override fun onCreateSuccess(sdp: SessionDescription?) {
                    sdp?.let { cont.resume(it) {} }
                }
                override fun onCreateFailure(error: String?) {
                    cont.cancel(Exception(error))
                }
                override fun onSetSuccess() {}
                override fun onSetFailure(error: String?) {}
            }, MediaConstraints())
        }
    }

    private suspend fun createAnswer(): SessionDescription {
        return kotlinx.coroutines.suspendCancellableCoroutine { cont ->
            peerConnection?.createAnswer(object : SdpObserver {
                override fun onCreateSuccess(sdp: SessionDescription?) {
                    sdp?.let { cont.resume(it) {} }
                }
                override fun onCreateFailure(error: String?) {
                    cont.cancel(Exception(error))
                }
                override fun onSetSuccess() {}
                override fun onSetFailure(error: String?) {}
            }, MediaConstraints())
        }
    }

    private fun cleanup() {
        videoCapturer?.stopCapture()
        videoCapturer?.dispose()
        videoCapturer = null
        localVideoSource?.dispose()
        localVideoSource = null
        localVideoTrack = null
        localAudioTrack = null
        _remoteVideoTrack.value = null
        _localVideoTrack2.value = null
        peerConnection?.close()
        peerConnection = null
        remoteDescriptionSet = false
        bufferedCandidates.clear()
        _isMuted.value = false
        _isCameraOff.value = false
        _callInfo.value = _callInfo.value?.copy(state = CallState.ENDED)
    }

    private class SdpObserverAdapter : SdpObserver {
        override fun onCreateSuccess(sdp: SessionDescription?) {}
        override fun onSetSuccess() {}
        override fun onCreateFailure(error: String?) {}
        override fun onSetFailure(error: String?) {}
    }
}
