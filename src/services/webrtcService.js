/**
 * WebRTC Service for FrndZone - SIMPLIFIED VERSION
 * 
 * This version DOES NOT depend on special backend events like 'prepare_webrtc' or 'create_offer'
 * It works with standard Socket.IO signaling:
 * - webrtc_offer
 * - webrtc_answer  
 * - ice_candidate
 * 
 * The key insight: RECEIVER creates peer connection IMMEDIATELY when answering,
 * then CALLER creates offer and sends it. This is the standard WebRTC flow.
 */

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
} from 'react-native-webrtc';

// Try to import InCallManager
let InCallManager = null;
try {
  InCallManager = require('react-native-incall-manager').default;
} catch (e) {
  console.log('InCallManager not available');
}

// ICE Servers with multiple TURN servers for reliability
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Free TURN servers
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isMuted = false;
    this.isSpeakerOn = false;
    this.targetUserId = null;
    this.callId = null;
    this.role = null; // 'caller' or 'receiver'
    
    // ICE candidate queue - store candidates until remote description is set
    this.iceCandidateQueue = [];
    this.remoteDescriptionSet = false;
    
    // Socket service reference
    this.socketService = null;
    
    // Callbacks
    this.onAudioConnected = null;
    this.onCallFailed = null;
    this.onRemoteStream = null;
  }

  /**
   * Set socket service reference
   */
  setSocketService(socket) {
    this.socketService = socket;
  }

  /**
   * Set callbacks
   */
  setCallbacks({ onAudioConnected, onCallFailed, onRemoteStream }) {
    if (onAudioConnected) this.onAudioConnected = onAudioConnected;
    if (onCallFailed) this.onCallFailed = onCallFailed;
    if (onRemoteStream) this.onRemoteStream = onRemoteStream;
  }

  /**
   * CALLER: Start call - get media, create connection, create offer
   */
  async startCall(targetUserId, callId) {
    try {
      console.log('📞 WebRTC [CALLER]: Starting call to', targetUserId);
      this.role = 'caller';
      this.targetUserId = targetUserId;
      this.callId = callId;
      this.remoteDescriptionSet = false;
      this.iceCandidateQueue = [];

      // Start audio mode
      this._startAudioMode();

      // Get microphone
      await this._getLocalStream();
      console.log('📞 WebRTC [CALLER]: Got local stream');

      // Create peer connection
      this._createPeerConnection();
      console.log('📞 WebRTC [CALLER]: Created peer connection');

      // Add tracks to peer connection
      this._addLocalTracks();
      console.log('📞 WebRTC [CALLER]: Added local tracks');

      // Create and send offer
      console.log('📞 WebRTC [CALLER]: Creating offer...');
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });

      await this.peerConnection.setLocalDescription(offer);
      console.log('📞 WebRTC [CALLER]: Local description set');

      // Send offer via socket
      if (this.socketService) {
        console.log('📞 WebRTC [CALLER]: Sending offer to', targetUserId);
        this.socketService.sendWebRTCOffer(targetUserId, {
          type: offer.type,
          sdp: offer.sdp,
        });
      }

      return true;
    } catch (error) {
      console.error('📞 WebRTC [CALLER]: Error starting call:', error);
      this._handleError(error);
      return false;
    }
  }

  /**
   * RECEIVER: Answer call - get media, create connection, wait for offer
   */
  async answerCall(targetUserId, callId) {
    try {
      console.log('📞 WebRTC [RECEIVER]: Preparing to answer call from', targetUserId);
      this.role = 'receiver';
      this.targetUserId = targetUserId;
      this.callId = callId;
      this.remoteDescriptionSet = false;
      this.iceCandidateQueue = [];

      // Start audio mode
      this._startAudioMode();

      // Get microphone FIRST
      await this._getLocalStream();
      console.log('📞 WebRTC [RECEIVER]: Got local stream');

      // Create peer connection
      this._createPeerConnection();
      console.log('📞 WebRTC [RECEIVER]: Created peer connection');

      // Add tracks to peer connection
      this._addLocalTracks();
      console.log('📞 WebRTC [RECEIVER]: Added local tracks, waiting for offer...');

      return true;
    } catch (error) {
      console.error('📞 WebRTC [RECEIVER]: Error answering call:', error);
      this._handleError(error);
      return false;
    }
  }

  /**
   * Handle incoming WebRTC offer (RECEIVER only)
   */
  async handleOffer(offer, fromUserId) {
    try {
      console.log('📞 WebRTC [RECEIVER]: Received offer from', fromUserId);
      
      if (!this.peerConnection) {
        console.error('📞 WebRTC: No peer connection! Creating one now...');
        await this.answerCall(fromUserId, this.callId);
      }

      this.targetUserId = fromUserId;

      // Set remote description
      const rtcOffer = new RTCSessionDescription({
        type: offer.type,
        sdp: offer.sdp,
      });
      
      await this.peerConnection.setRemoteDescription(rtcOffer);
      this.remoteDescriptionSet = true;
      console.log('📞 WebRTC [RECEIVER]: Remote description set');

      // Process queued ICE candidates
      await this._processQueuedCandidates();

      // Create answer
      console.log('📞 WebRTC [RECEIVER]: Creating answer...');
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('📞 WebRTC [RECEIVER]: Local description (answer) set');

      // Send answer via socket
      if (this.socketService) {
        console.log('📞 WebRTC [RECEIVER]: Sending answer to', fromUserId);
        this.socketService.sendWebRTCAnswer(fromUserId, {
          type: answer.type,
          sdp: answer.sdp,
        });
      }

      return true;
    } catch (error) {
      console.error('📞 WebRTC [RECEIVER]: Error handling offer:', error);
      this._handleError(error);
      return false;
    }
  }

  /**
   * Handle incoming WebRTC answer (CALLER only)
   */
  async handleAnswer(answer, fromUserId) {
    try {
      console.log('📞 WebRTC [CALLER]: Received answer from', fromUserId);
      
      if (!this.peerConnection) {
        console.error('📞 WebRTC: No peer connection!');
        return false;
      }

      // Check signaling state
      const state = this.peerConnection.signalingState;
      console.log('📞 WebRTC [CALLER]: Current signaling state:', state);

      if (state !== 'have-local-offer') {
        console.warn('📞 WebRTC [CALLER]: Cannot set answer in state:', state);
        return false;
      }

      // Set remote description
      const rtcAnswer = new RTCSessionDescription({
        type: answer.type,
        sdp: answer.sdp,
      });

      await this.peerConnection.setRemoteDescription(rtcAnswer);
      this.remoteDescriptionSet = true;
      console.log('📞 WebRTC [CALLER]: Remote description (answer) set');

      // Process queued ICE candidates
      await this._processQueuedCandidates();

      return true;
    } catch (error) {
      console.error('📞 WebRTC [CALLER]: Error handling answer:', error);
      this._handleError(error);
      return false;
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleIceCandidate(candidate, fromUserId) {
    try {
      if (!candidate) return;

      // Queue if remote description not set yet
      if (!this.remoteDescriptionSet || !this.peerConnection) {
        console.log('📞 WebRTC: Queuing ICE candidate (waiting for remote desc)');
        this.iceCandidateQueue.push(candidate);
        return;
      }

      const rtcCandidate = new RTCIceCandidate(candidate);
      await this.peerConnection.addIceCandidate(rtcCandidate);
      console.log('📞 WebRTC: Added ICE candidate');
    } catch (error) {
      // Ignore benign errors
      if (!error.message?.includes('location not found')) {
        console.warn('📞 WebRTC: ICE candidate error:', error.message);
      }
    }
  }

  /**
   * Process queued ICE candidates
   */
  async _processQueuedCandidates() {
    if (this.iceCandidateQueue.length === 0) return;

    console.log('📞 WebRTC: Processing', this.iceCandidateQueue.length, 'queued ICE candidates');
    
    for (const candidate of this.iceCandidateQueue) {
      try {
        const rtcCandidate = new RTCIceCandidate(candidate);
        await this.peerConnection.addIceCandidate(rtcCandidate);
      } catch (e) {
        // Ignore errors
      }
    }
    
    this.iceCandidateQueue = [];
  }

  /**
   * Start audio mode
   */
  _startAudioMode() {
    if (InCallManager) {
      try {
        InCallManager.start({ media: 'audio' });
        InCallManager.setKeepScreenOn(true);
        InCallManager.setForceSpeakerphoneOn(false);
        console.log('📞 Audio mode started');
      } catch (e) {
        console.warn('InCallManager start error:', e);
      }
    }
  }

  /**
   * Get local audio stream
   */
  async _getLocalStream() {
    console.log('📞 WebRTC: Requesting microphone...');
    
    this.localStream = await mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    const audioTracks = this.localStream.getAudioTracks();
    console.log('📞 WebRTC: Got', audioTracks.length, 'audio track(s)');

    if (audioTracks.length === 0) {
      throw new Error('No audio tracks available');
    }

    // Ensure tracks are enabled
    audioTracks.forEach(track => {
      track.enabled = true;
      console.log('📞 WebRTC: Audio track', track.id, 'enabled:', track.enabled);
    });

    return this.localStream;
  }

  /**
   * Create RTCPeerConnection
   */
  _createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // ICE candidate handler - send to remote peer
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socketService && this.targetUserId) {
        this.socketService.sendICECandidate(this.targetUserId, event.candidate);
      }
    };

    // ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('📞 WebRTC: ICE connection state:', state);

      if (state === 'connected' || state === 'completed') {
        console.log('✅✅✅ WebRTC: AUDIO CONNECTED! ✅✅✅');
        if (this.onAudioConnected) {
          this.onAudioConnected();
        }
      } else if (state === 'failed') {
        console.error('❌ WebRTC: ICE connection FAILED');
        if (this.onCallFailed) {
          this.onCallFailed('connection_failed');
        }
      } else if (state === 'disconnected') {
        console.warn('⚠️ WebRTC: ICE disconnected');
      }
    };

    // Connection state
    this.peerConnection.onconnectionstatechange = () => {
      console.log('📞 WebRTC: Connection state:', this.peerConnection?.connectionState);
    };

    // Signaling state
    this.peerConnection.onsignalingstatechange = () => {
      console.log('📞 WebRTC: Signaling state:', this.peerConnection?.signalingState);
    };

    // CRITICAL: Handle incoming remote tracks (THIS IS WHERE AUDIO COMES FROM)
    this.peerConnection.ontrack = (event) => {
      console.log('📞📞📞 WebRTC: RECEIVED REMOTE TRACK! 📞📞📞');
      console.log('📞 Track kind:', event.track.kind);
      console.log('📞 Track enabled:', event.track.enabled);
      console.log('📞 Track readyState:', event.track.readyState);

      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        console.log('📞 WebRTC: Remote stream set with', this.remoteStream.getTracks().length, 'tracks');
        
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      }
    };

    // ICE gathering state
    this.peerConnection.onicegatheringstatechange = () => {
      console.log('📞 WebRTC: ICE gathering state:', this.peerConnection?.iceGatheringState);
    };
  }

  /**
   * Add local tracks to peer connection
   */
  _addLocalTracks() {
    if (!this.localStream || !this.peerConnection) {
      console.error('📞 WebRTC: Cannot add tracks - missing stream or connection');
      return;
    }

    const tracks = this.localStream.getTracks();
    console.log('📞 WebRTC: Adding', tracks.length, 'track(s) to peer connection');

    tracks.forEach((track) => {
      this.peerConnection.addTrack(track, this.localStream);
      console.log('📞 WebRTC: Added track:', track.kind, track.id);
    });
  }

  /**
   * Handle errors
   */
  _handleError(error) {
    console.error('📞 WebRTC Error:', error);
    if (this.onCallFailed) {
      this.onCallFailed(error.message || 'WebRTC error');
    }
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isMuted = !audioTrack.enabled;
        console.log('📞 WebRTC: Mute:', this.isMuted);
      }
    }
    return this.isMuted;
  }

  /**
   * Toggle speaker
   */
  toggleSpeaker() {
    this.isSpeakerOn = !this.isSpeakerOn;
    if (InCallManager) {
      InCallManager.setForceSpeakerphoneOn(this.isSpeakerOn);
    }
    console.log('📞 WebRTC: Speaker:', this.isSpeakerOn);
    return this.isSpeakerOn;
  }

  /**
   * Check if audio is connected
   */
  isAudioConnected() {
    if (!this.peerConnection) return false;
    const state = this.peerConnection.iceConnectionState;
    return state === 'connected' || state === 'completed';
  }

  /**
   * Cleanup - call this when ending call
   */
  cleanup() {
    console.log('📞 WebRTC: Cleaning up...');

    // Stop local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('📞 WebRTC: Stopped track:', track.kind);
      });
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop InCallManager
    if (InCallManager) {
      try {
        InCallManager.stop();
      } catch (e) {}
    }

    // Reset state
    this.remoteStream = null;
    this.isMuted = false;
    this.isSpeakerOn = false;
    this.targetUserId = null;
    this.callId = null;
    this.role = null;
    this.remoteDescriptionSet = false;
    this.iceCandidateQueue = [];

    console.log('📞 WebRTC: Cleanup complete');
  }
}

export const webRTCService = new WebRTCService();
export default webRTCService;
