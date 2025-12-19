/**
 * WebRTC Service for FrndZone - FULLY FIXED VERSION
 * 
 * CRITICAL FIXES:
 * 1. Proper initialization timing - receiver must setup BEFORE caller sends offer
 * 2. Separated caller vs receiver initialization
 * 3. Proper ICE candidate queueing
 * 4. Audio track verification
 * 5. Connection state handling
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

// ICE Servers - CRITICAL for NAT traversal
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Free TURN servers for better connectivity
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
    this.onRemoteStreamCallback = null;
    this.onConnectionStateChangeCallback = null;
    this.onCallConnectedCallback = null;
    this.onCallEndedCallback = null;
    this.onAudioConnectedCallback = null;
  }

  /**
   * Set socket service reference
   */
  setSocketService(socketService) {
    this.socketService = socketService;
    this._setupSocketListeners();
  }

  /**
   * Setup socket listeners for WebRTC signaling
   */
  _setupSocketListeners() {
    if (!this.socketService) return;

    this.socketService.setWebRTCCallbacks({
      // When we receive an offer (receiver only)
      onOffer: async (data) => {
        console.log('📞 WebRTC: Received OFFER from', data.fromUserId);
        await this._handleRemoteOffer(data.offer, data.fromUserId);
      },
      
      // When we receive an answer (caller only)
      onAnswer: async (data) => {
        console.log('📞 WebRTC: Received ANSWER from', data.fromUserId);
        await this._handleRemoteAnswer(data.answer);
      },
      
      // ICE candidates from remote
      onICECandidate: async (data) => {
        await this._addIceCandidate(data.candidate);
      },
      
      // Server tells receiver to prepare WebRTC
      onPrepareWebRTC: async (data) => {
        console.log('📞 WebRTC: Preparing as RECEIVER');
        this.targetUserId = data.remoteUserId;
        this.callId = data.callId;
        this.isCaller = false;
        await this._prepareAsReceiver();
      },
      
      // Server tells caller to create offer (after receiver is ready)
      onCallAnsweredWithOffer: async (data) => {
        console.log('📞 WebRTC: Call answered, initializing as CALLER');
        this.targetUserId = data.remoteUserId;
        this.callId = data.callId;
        this.isCaller = true;
        await this._initializeAsCaller();
      },
    });
  }

  /**
   * CALLER: Initialize WebRTC and create offer
   * Called AFTER server confirms receiver is ready
   */
  async _initializeAsCaller() {
    try {
      console.log('📞 WebRTC: CALLER initializing...');
      
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
      this._notifyError('Failed to initialize call');
      return false;
    }
  }

  /**
   * RECEIVER: Prepare WebRTC (setup peer connection, wait for offer)
   * Called when server sends 'prepare_webrtc'
   */
  async _prepareAsReceiver() {
    try {
      console.log('📞 WebRTC: RECEIVER preparing...');
      
      // Start audio session
      this._startAudioSession();

      // Get microphone FIRST
      await this._getLocalStream();

      // Create peer connection
      await this._createPeerConnection();

      // Add local tracks BEFORE receiving offer
      this._addLocalTracks();

      this.isInitialized = true;
      console.log('📞 WebRTC: RECEIVER ready, waiting for offer');
      
      // Tell server we're ready
      if (this.socketService && this.callId) {
        this.socketService.signalWebRTCReady(this.callId);
      }
      
      return true;
    } catch (error) {
      console.error('📞 WebRTC: RECEIVER prep error:', error);
      this._notifyError('Failed to prepare for call');
      return false;
    }
  }

  /**
   * PUBLIC: Manual initialization as caller (for compatibility)
   */
  async initializeAsCaller(targetUserId, callId) {
    this.targetUserId = targetUserId;
    this.callId = callId;
    this.isCaller = true;
    return await this._initializeAsCaller();
  }

  /**
   * PUBLIC: Manual initialization as receiver (for compatibility)
   */
  async initializeAsReceiver(targetUserId, callId) {
    this.targetUserId = targetUserId;
    this.callId = callId;
    this.isCaller = false;
    return await this._prepareAsReceiver();
  }

  /**
   * Start audio session for calls
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
      console.log('📞 WebRTC: Requesting microphone...');
      
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
        video: false,
      };

      this.localStream = await mediaDevices.getUserMedia(constraints);
      
      const audioTracks = this.localStream.getAudioTracks();
      console.log('📞 WebRTC: Got', audioTracks.length, 'audio track(s)');
      
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks available');
      }

      // Verify track is enabled
      audioTracks.forEach(track => {
        console.log('📞 Audio track:', track.id, 'enabled:', track.enabled, 'muted:', track.muted);
        track.enabled = true;
      });

      return this.localStream;
    } catch (error) {
      console.error('📞 WebRTC: Microphone error:', error);
      throw error;
    }
  }

  /**
   * Create RTCPeerConnection with handlers
   */
  async _createPeerConnection() {
    console.log('📞 WebRTC: Creating peer connection...');
    
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    this.hasRemoteDescription = false;

    // ICE candidate handler - send to remote
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socketService && this.targetUserId) {
        console.log('📞 WebRTC: Sending ICE candidate');
        this.socketService.sendICECandidate(this.targetUserId, event.candidate);
      }
    };

    // ICE connection state - CRITICAL for knowing when audio works
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection?.iceConnectionState;
      console.log('📞 WebRTC: ICE state:', state);

      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(state);
      }

      if (state === 'connected' || state === 'completed') {
        console.log('✅ WebRTC: ICE CONNECTED - Audio should work now!');
        
        // Notify server that we're connected
        if (this.socketService && this.callId) {
          this.socketService.signalCallConnected(this.callId);
        }
        
        if (this.onCallConnectedCallback) {
          this.onCallConnectedCallback();
        }
        if (this.onAudioConnectedCallback) {
          this.onAudioConnectedCallback();
        }
      } else if (state === 'failed') {
        console.error('❌ WebRTC: ICE FAILED');
        this._notifyError('Connection failed');
        if (this.onCallEndedCallback) {
          this.onCallEndedCallback('connection_failed');
        }
      } else if (state === 'disconnected') {
        console.warn('⚠️ WebRTC: ICE disconnected');
      }
    };

    // Connection state
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('📞 WebRTC: Connection state:', state);
      
      if (state === 'failed' || state === 'closed') {
        console.error('📞 WebRTC: Connection', state);
      }
    };

    // Signaling state
    this.peerConnection.onsignalingstatechange = () => {
      console.log('📞 WebRTC: Signaling state:', this.peerConnection?.signalingState);
    };

    // CRITICAL: Remote track handler - this is where we get audio
    this.peerConnection.ontrack = (event) => {
      console.log('📞 WebRTC: *** RECEIVED REMOTE TRACK ***');
      console.log('   Track kind:', event.track.kind);
      console.log('   Track enabled:', event.track.enabled);
      console.log('   Track muted:', event.track.muted);
      
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        
        const remoteTracks = this.remoteStream.getAudioTracks();
        console.log('📞 WebRTC: Remote stream has', remoteTracks.length, 'audio track(s)');
        
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(this.remoteStream);
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
      console.error('📞 WebRTC: Cannot add tracks - no stream or connection');
      return;
    }

    const tracks = this.localStream.getTracks();
    console.log('📞 WebRTC: Adding', tracks.length, 'local track(s)');
    
    tracks.forEach((track) => {
      console.log('📞 WebRTC: Adding track:', track.kind, 'enabled:', track.enabled);
      this.peerConnection.addTrack(track, this.localStream);
    });
  }

  /**
   * Create SDP offer and send to remote (CALLER only)
   */
  async _createAndSendOffer() {
    try {
      console.log('📞 WebRTC: Creating offer...');
      
      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      };

      const offer = await this.peerConnection.createOffer(offerOptions);
      
      console.log('📞 WebRTC: Setting local description (offer)...');
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
   * Handle incoming offer (RECEIVER only)
   */
  async _handleRemoteOffer(offer, fromUserId) {
    try {
      console.log('📞 WebRTC: Handling offer from:', fromUserId);
      
      // Make sure we have a peer connection
      if (!this.peerConnection) {
        console.log('📞 WebRTC: Creating peer connection for offer...');
        await this._prepareAsReceiver();
      }

      this.targetUserId = fromUserId;

      // Set remote description (the offer)
      console.log('📞 WebRTC: Setting remote description (offer)...');
      const rtcOffer = new RTCSessionDescription(offer);
      await this.peerConnection.setRemoteDescription(rtcOffer);
      this.hasRemoteDescription = true;
      
      console.log('📞 WebRTC: Remote description set');

      // Process any queued ICE candidates
      await this._processPendingCandidates();

      // Create and send answer
      await this._createAndSendAnswer();
    } catch (error) {
      console.error('📞 WebRTC: Handle offer error:', error);
      this._notifyError('Failed to process call');
    }
  }

  /**
   * Create SDP answer and send to remote (RECEIVER only)
   */
  async _createAndSendAnswer() {
    try {
      console.log('📞 WebRTC: Creating answer...');
      
      const answer = await this.peerConnection.createAnswer();
      
      console.log('📞 WebRTC: Setting local description (answer)...');
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
   * Handle incoming answer (CALLER only)
   */
  async _handleRemoteAnswer(answer) {
    try {
      console.log('📞 WebRTC: Handling answer');
      
      if (!this.peerConnection) {
        console.error('📞 WebRTC: No peer connection for answer');
        return;
      }

      const signalingState = this.peerConnection.signalingState;
      console.log('📞 WebRTC: Current signaling state:', signalingState);
      
      if (signalingState !== 'have-local-offer') {
        console.warn('📞 WebRTC: Unexpected state for answer:', signalingState);
        // Still try to set it
      }

      console.log('📞 WebRTC: Setting remote description (answer)...');
      const rtcAnswer = new RTCSessionDescription(answer);
      await this.peerConnection.setRemoteDescription(rtcAnswer);
      this.hasRemoteDescription = true;
      
      console.log('📞 WebRTC: Remote description (answer) set');

      // Process any queued ICE candidates
      await this._processPendingCandidates();
    } catch (error) {
      console.error('📞 WebRTC: Handle answer error:', error);
    }
  }

  /**
   * Add ICE candidate (queue if not ready)
   */
  async _addIceCandidate(candidate) {
    try {
      if (!candidate) return;

      // Queue if peer connection not ready or no remote description
      if (!this.peerConnection || !this.hasRemoteDescription) {
        console.log('📞 WebRTC: Queuing ICE candidate (not ready yet)');
        this.pendingIceCandidates.push(candidate);
        return;
      }

      console.log('📞 WebRTC: Adding ICE candidate');
      const rtcCandidate = new RTCIceCandidate(candidate);
      await this.peerConnection.addIceCandidate(rtcCandidate);
    } catch (error) {
      // Ignore errors for invalid candidates
      if (!error.message?.includes('location not found')) {
        console.error('📞 WebRTC: Add ICE error:', error.message);
      }
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
      await this._addIceCandidate(candidate);
    }
  }

  /**
   * Notify error callback
   */
  _notifyError(message) {
    console.error('📞 WebRTC Error:', message);
    if (this.onCallEndedCallback) {
      this.onCallEndedCallback('error');
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
   * Set callbacks
   */
  setCallbacks({ onRemoteStream, onConnectionStateChange, onCallConnected, onCallEnded, onAudioConnected }) {
    this.onRemoteStreamCallback = onRemoteStream || null;
    this.onConnectionStateChangeCallback = onConnectionStateChange || null;
    this.onCallConnectedCallback = onCallConnected || null;
    this.onCallEndedCallback = onCallEnded || null;
    this.onAudioConnectedCallback = onAudioConnected || null;
  }

  /**
   * Full cleanup
   */
  cleanup() {
    console.log('📞 WebRTC: Cleaning up...');

    // Stop local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
        console.log('📞 Stopped track:', track.kind);
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