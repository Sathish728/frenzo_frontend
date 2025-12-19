/**
 * WebRTC Service for FrndZone - PRODUCTION FIXED VERSION
 * 
 * This version properly handles:
 * 1. Caller flow: wait for call_answered -> wait for create_offer -> create offer -> send
 * 2. Receiver flow: answer call -> prepare_webrtc -> setup peer -> webrtc_ready -> receive offer -> send answer
 * 3. Proper ICE candidate queuing
 * 4. Audio track verification
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

// ICE Servers
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
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
    this.isInitialized = false;
    this.pendingIceCandidates = [];
    this.socketService = null;
    this.targetUserId = null;
    this.callId = null;
    this.isCaller = false;
    this.hasRemoteDescription = false;
    
    // Callbacks
    this.callbacks = {
      onRemoteStream: null,
      onConnectionStateChange: null,
      onCallConnected: null,
      onCallEnded: null,
      onAudioConnected: null,
    };
  }

  /**
   * Set socket service reference and setup listeners
   */
  setSocketService(socketService) {
    this.socketService = socketService;
    this._setupSocketCallbacks();
  }

  /**
   * Set callbacks
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Setup socket callbacks for WebRTC signaling
   */
  _setupSocketCallbacks() {
    if (!this.socketService) return;

    // Handle incoming offer (receiver only)
    this.socketService.setCallback('onWebRTCOffer', async (data) => {
      console.log('📞 WebRTC: Received OFFER');
      await this.handleOffer(data.offer, data.fromUserId);
    });

    // Handle incoming answer (caller only)
    this.socketService.setCallback('onWebRTCAnswer', async (data) => {
      console.log('📞 WebRTC: Received ANSWER');
      await this.handleAnswer(data.answer);
    });

    // Handle ICE candidates
    this.socketService.setCallback('onICECandidate', async (data) => {
      console.log('📞 WebRTC: Received ICE candidate');
      await this.addIceCandidate(data.candidate);
    });
  }

  /**
   * CALLER: Initialize WebRTC and create offer
   * Called when we receive 'create_offer' from server
   */
  async initializeAsCaller(targetUserId, callId) {
    try {
      console.log('📞 WebRTC: Initializing as CALLER');
      
      this.targetUserId = targetUserId;
      this.callId = callId;
      this.isCaller = true;

      // Start audio session
      this._startAudioSession();

      // Get microphone
      await this._getLocalStream();
      
      // Create peer connection
      await this._createPeerConnection();

      // Add local tracks
      this._addLocalTracks();

      // Create and send offer
      await this._createAndSendOffer();

      this.isInitialized = true;
      console.log('📞 WebRTC: CALLER initialized, offer sent');
      return true;
    } catch (error) {
      console.error('📞 WebRTC: CALLER init error:', error);
      if (this.callbacks.onCallEnded) {
        this.callbacks.onCallEnded('webrtc_error');
      }
      return false;
    }
  }

  /**
   * RECEIVER: Prepare WebRTC (called when 'prepare_webrtc' received)
   */
  async prepareAsReceiver(callId, targetUserId) {
    try {
      console.log('📞 WebRTC: Preparing as RECEIVER');
      
      this.callId = callId;
      this.targetUserId = targetUserId;
      this.isCaller = false;

      // Start audio session
      this._startAudioSession();

      // Get microphone FIRST
      await this._getLocalStream();

      // Create peer connection
      await this._createPeerConnection();

      // Add local tracks BEFORE receiving offer
      this._addLocalTracks();

      this.isInitialized = true;
      console.log('📞 WebRTC: RECEIVER ready, signaling to server');
      
      // Tell server we're ready to receive offer
      if (this.socketService) {
        this.socketService.signalWebRTCReady(callId);
      }
      
      return true;
    } catch (error) {
      console.error('📞 WebRTC: RECEIVER prep error:', error);
      if (this.callbacks.onCallEnded) {
        this.callbacks.onCallEnded('webrtc_error');
      }
      return false;
    }
  }

  /**
   * Handle incoming offer (RECEIVER only)
   */
  async handleOffer(offer, fromUserId) {
    try {
      console.log('📞 WebRTC: Handling offer from:', fromUserId);
      
      if (!this.peerConnection) {
        console.error('📞 WebRTC: No peer connection for offer');
        return false;
      }

      this.targetUserId = fromUserId;

      // Set remote description (the offer)
      console.log('📞 WebRTC: Setting remote description (offer)');
      const rtcOffer = new RTCSessionDescription(offer);
      await this.peerConnection.setRemoteDescription(rtcOffer);
      this.hasRemoteDescription = true;
      
      console.log('📞 WebRTC: Remote description set');

      // Process any queued ICE candidates
      await this._processPendingCandidates();

      // Create and send answer
      await this._createAndSendAnswer();
      
      return true;
    } catch (error) {
      console.error('📞 WebRTC: Handle offer error:', error);
      return false;
    }
  }

  /**
   * Handle incoming answer (CALLER only)
   */
  async handleAnswer(answer) {
    try {
      console.log('📞 WebRTC: Handling answer');
      
      if (!this.peerConnection) {
        console.error('📞 WebRTC: No peer connection for answer');
        return false;
      }

      const signalingState = this.peerConnection.signalingState;
      console.log('📞 WebRTC: Current signaling state:', signalingState);

      console.log('📞 WebRTC: Setting remote description (answer)');
      const rtcAnswer = new RTCSessionDescription(answer);
      await this.peerConnection.setRemoteDescription(rtcAnswer);
      this.hasRemoteDescription = true;
      
      console.log('📞 WebRTC: Remote description (answer) set');

      // Process any queued ICE candidates
      await this._processPendingCandidates();
      
      return true;
    } catch (error) {
      console.error('📞 WebRTC: Handle answer error:', error);
      return false;
    }
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(candidate) {
    try {
      if (!candidate) return;

      // Queue if not ready
      if (!this.peerConnection || !this.hasRemoteDescription) {
        console.log('📞 WebRTC: Queuing ICE candidate');
        this.pendingIceCandidates.push(candidate);
        return;
      }

      const rtcCandidate = new RTCIceCandidate(candidate);
      await this.peerConnection.addIceCandidate(rtcCandidate);
      console.log('📞 WebRTC: ICE candidate added');
    } catch (error) {
      if (!error.message?.includes('location not found')) {
        console.error('📞 WebRTC: Add ICE error:', error.message);
      }
    }
  }

  /**
   * Start audio session
   */
  _startAudioSession() {
    if (InCallManager) {
      try {
        InCallManager.start({ media: 'audio' });
        InCallManager.setKeepScreenOn(true);
        InCallManager.setForceSpeakerphoneOn(false);
        console.log('📞 Audio session started');
      } catch (e) {
        console.log('InCallManager start error:', e);
      }
    }
  }

  /**
   * Get local audio stream
   */
  async _getLocalStream() {
    try {
      console.log('📞 WebRTC: Requesting microphone');
      
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      };

      this.localStream = await mediaDevices.getUserMedia(constraints);
      
      const audioTracks = this.localStream.getAudioTracks();
      console.log('📞 WebRTC: Got', audioTracks.length, 'audio track(s)');
      
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks available');
      }

      // Ensure track is enabled
      audioTracks.forEach(track => {
        track.enabled = true;
        console.log('📞 Audio track:', track.id, 'enabled:', track.enabled);
      });

      return this.localStream;
    } catch (error) {
      console.error('📞 WebRTC: Microphone error:', error);
      throw error;
    }
  }

  /**
   * Create RTCPeerConnection
   */
  async _createPeerConnection() {
    console.log('📞 WebRTC: Creating peer connection');
    
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    this.hasRemoteDescription = false;

    // ICE candidate handler
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socketService && this.targetUserId) {
        console.log('📞 WebRTC: Sending ICE candidate');
        this.socketService.sendICECandidate(this.targetUserId, event.candidate);
      }
    };

    // ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('📞 WebRTC: ICE state:', state);

      if (this.callbacks.onConnectionStateChange) {
        this.callbacks.onConnectionStateChange(state);
      }

      if (state === 'connected' || state === 'completed') {
        console.log('✅ WebRTC: ICE CONNECTED - Audio should work!');
        
        // Signal to server
        if (this.socketService && this.callId) {
          this.socketService.signalCallConnected(this.callId);
        }
        
        if (this.callbacks.onCallConnected) {
          this.callbacks.onCallConnected();
        }
        if (this.callbacks.onAudioConnected) {
          this.callbacks.onAudioConnected();
        }
      } else if (state === 'failed') {
        console.error('❌ WebRTC: ICE FAILED');
        if (this.callbacks.onCallEnded) {
          this.callbacks.onCallEnded('connection_failed');
        }
      }
    };

    // Connection state
    this.peerConnection.onconnectionstatechange = () => {
      console.log('📞 WebRTC: Connection state:', this.peerConnection?.connectionState);
    };

    // Remote track handler - THIS IS WHERE WE GET AUDIO
    this.peerConnection.ontrack = (event) => {
      console.log('📞 WebRTC: *** RECEIVED REMOTE TRACK ***');
      console.log('   Track kind:', event.track.kind);
      console.log('   Track enabled:', event.track.enabled);
      
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        console.log('📞 WebRTC: Remote stream set');
        
        if (this.callbacks.onRemoteStream) {
          this.callbacks.onRemoteStream(this.remoteStream);
        }
      }
    };

    console.log('📞 WebRTC: Peer connection created');
  }

  /**
   * Add local tracks to peer connection
   */
  _addLocalTracks() {
    if (!this.localStream || !this.peerConnection) {
      console.error('📞 WebRTC: Cannot add tracks');
      return;
    }

    const tracks = this.localStream.getTracks();
    console.log('📞 WebRTC: Adding', tracks.length, 'local track(s)');
    
    tracks.forEach((track) => {
      console.log('📞 WebRTC: Adding track:', track.kind);
      this.peerConnection.addTrack(track, this.localStream);
    });
  }

  /**
   * Create and send offer
   */
  async _createAndSendOffer() {
    try {
      console.log('📞 WebRTC: Creating offer');
      
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      
      console.log('📞 WebRTC: Setting local description (offer)');
      await this.peerConnection.setLocalDescription(offer);
      
      console.log('📞 WebRTC: Sending offer to:', this.targetUserId);
      if (this.socketService && this.targetUserId) {
        this.socketService.sendWebRTCOffer(this.targetUserId, offer);
      }
    } catch (error) {
      console.error('📞 WebRTC: Create offer error:', error);
      throw error;
    }
  }

  /**
   * Create and send answer
   */
  async _createAndSendAnswer() {
    try {
      console.log('📞 WebRTC: Creating answer');
      
      const answer = await this.peerConnection.createAnswer();
      
      console.log('📞 WebRTC: Setting local description (answer)');
      await this.peerConnection.setLocalDescription(answer);
      
      console.log('📞 WebRTC: Sending answer to:', this.targetUserId);
      if (this.socketService && this.targetUserId) {
        this.socketService.sendWebRTCAnswer(this.targetUserId, answer);
      }
    } catch (error) {
      console.error('📞 WebRTC: Create answer error:', error);
      throw error;
    }
  }

  /**
   * Process queued ICE candidates
   */
  async _processPendingCandidates() {
    if (this.pendingIceCandidates.length === 0) return;
    
    console.log('📞 WebRTC: Processing', this.pendingIceCandidates.length, 'queued ICE candidates');
    
    const candidates = [...this.pendingIceCandidates];
    this.pendingIceCandidates = [];
    
    for (const candidate of candidates) {
      try {
        const rtcCandidate = new RTCIceCandidate(candidate);
        await this.peerConnection.addIceCandidate(rtcCandidate);
      } catch (e) {
        // Ignore errors for invalid candidates
      }
    }
  }

  /**
   * Toggle microphone mute
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
   * Full cleanup
   */
  cleanup() {
    console.log('📞 WebRTC: Cleaning up');

    // Stop local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
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
    this.isInitialized = false;
    this.targetUserId = null;
    this.callId = null;
    this.isCaller = false;
    this.hasRemoteDescription = false;
    this.pendingIceCandidates = [];

    console.log('📞 WebRTC: Cleanup complete');
  }
}

export const webRTCService = new WebRTCService();
export default webRTCService;
