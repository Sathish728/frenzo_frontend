/**
 * WebRTC Service for Real-Time Voice Calls
 * FIXED VERSION - Proper peer-to-peer audio connection
 */

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';

// ICE Servers for NAT traversal
const ICE_SERVERS = {
  iceServers: [
    {urls: 'stun:stun.l.google.com:19302'},
    {urls: 'stun:stun1.l.google.com:19302'},
    {urls: 'stun:stun2.l.google.com:19302'},
    {urls: 'stun:stun3.l.google.com:19302'},
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
    
    // Callbacks
    this.onRemoteStreamCallback = null;
    this.onConnectionStateChangeCallback = null;
    this.onCallConnectedCallback = null;
    this.onCallEndedCallback = null;
  }

  /**
   * Set socket service and setup listeners
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
      onOffer: async (data) => {
        // Handle both 'from' and 'fromUserId' field names
        const fromUser = data.fromUserId || data.from;
        console.log('📞 WebRTC: Received offer from', fromUser);
        await this._handleRemoteOffer(data.offer, fromUser);
      },
      onAnswer: async (data) => {
        const fromUser = data.fromUserId || data.from;
        console.log('📞 WebRTC: Received answer from', fromUser);
        await this._handleRemoteAnswer(data.answer);
      },
      onICECandidate: async (data) => {
        console.log('📞 WebRTC: Received ICE candidate');
        await this._addIceCandidate(data.candidate);
      },
    });
  }

  /**
   * Initialize as CALLER - creates offer after getting local stream
   */
  async initializeAsCaller(targetUserId, callId) {
    try {
      console.log('📞 WebRTC: Initializing as CALLER to:', targetUserId);
      
      this.cleanup(); // Clean any previous connection
      
      this.targetUserId = targetUserId;
      this.callId = callId;
      this.isCaller = true;

      // Start audio session
      InCallManager.start({media: 'audio'});
      InCallManager.setKeepScreenOn(true);
      InCallManager.setForceSpeakerphoneOn(false);

      // Get microphone access FIRST
      await this._getLocalStream();
      
      // Create peer connection
      await this._createPeerConnection();

      // Add local tracks to connection
      this._addLocalTracks();

      // Create and send offer
      await this._createAndSendOffer();

      this.isInitialized = true;
      console.log('📞 WebRTC: Caller initialized and offer sent');
      return true;
    } catch (error) {
      console.error('📞 WebRTC: Caller init error:', error);
      this.cleanup();
      return false;
    }
  }

  /**
   * Initialize as RECEIVER - waits for offer, then creates answer
   */
  async initializeAsReceiver(targetUserId, callId) {
    try {
      console.log('📞 WebRTC: Initializing as RECEIVER from:', targetUserId);
      
      this.cleanup(); // Clean any previous connection
      
      this.targetUserId = targetUserId;
      this.callId = callId;
      this.isCaller = false;

      // Start audio session
      InCallManager.start({media: 'audio'});
      InCallManager.setKeepScreenOn(true);
      InCallManager.setForceSpeakerphoneOn(false);

      // Get microphone access
      await this._getLocalStream();

      // Create peer connection (will wait for offer)
      await this._createPeerConnection();

      // Add local tracks
      this._addLocalTracks();

      this.isInitialized = true;
      console.log('📞 WebRTC: Receiver initialized, waiting for offer...');
      return true;
    } catch (error) {
      console.error('📞 WebRTC: Receiver init error:', error);
      this.cleanup();
      return false;
    }
  }

  /**
   * Get local audio stream from microphone
   */
  async _getLocalStream() {
    try {
      console.log('📞 WebRTC: Requesting microphone...');
      
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
      console.log('📞 WebRTC: Got local audio tracks:', audioTracks.length);
      
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks available');
      }

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
    console.log('📞 WebRTC: Creating peer connection...');
    
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

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

      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(state);
      }

      if (state === 'connected' || state === 'completed') {
        console.log('✅ WebRTC: AUDIO CONNECTED!');
        if (this.onCallConnectedCallback) {
          this.onCallConnectedCallback();
        }
      } else if (state === 'failed') {
        console.error('❌ WebRTC: Connection FAILED');
        if (this.onCallEndedCallback) {
          this.onCallEndedCallback('connection_failed');
        }
      } else if (state === 'disconnected') {
        console.warn('⚠️ WebRTC: Disconnected, may reconnect...');
      }
    };

    // Connection state
    this.peerConnection.onconnectionstatechange = () => {
      console.log('📞 WebRTC: Connection state:', this.peerConnection?.connectionState);
    };

    // Remote track handler - THIS IS WHERE WE RECEIVE AUDIO
    this.peerConnection.ontrack = (event) => {
      console.log('📞 WebRTC: Received remote track:', event.track.kind);
      
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        console.log('✅ WebRTC: Remote audio stream received!');
        
        // Log remote audio tracks
        const remoteTracks = this.remoteStream.getAudioTracks();
        console.log('📞 WebRTC: Remote audio tracks:', remoteTracks.length);
        
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(this.remoteStream);
        }
      }
    };

    // Negotiation needed
    this.peerConnection.onnegotiationneeded = () => {
      console.log('📞 WebRTC: Negotiation needed');
    };

    console.log('📞 WebRTC: Peer connection created');
  }

  /**
   * Add local tracks to peer connection
   */
  _addLocalTracks() {
    if (!this.localStream || !this.peerConnection) {
      console.error('📞 WebRTC: No local stream or peer connection');
      return;
    }

    this.localStream.getTracks().forEach((track) => {
      console.log('📞 WebRTC: Adding local track:', track.kind, track.enabled);
      this.peerConnection.addTrack(track, this.localStream);
    });
  }

  /**
   * Create and send SDP offer (caller only)
   */
  async _createAndSendOffer() {
    try {
      console.log('📞 WebRTC: Creating offer...');
      
      const offerOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      };

      const offer = await this.peerConnection.createOffer(offerOptions);
      console.log('📞 WebRTC: Offer created, setting local description...');
      
      await this.peerConnection.setLocalDescription(offer);
      console.log('📞 WebRTC: Local description set');

      // Send offer via socket
      if (this.socketService && this.targetUserId) {
        console.log('📞 WebRTC: Sending offer to:', this.targetUserId);
        this.socketService.sendWebRTCOffer(this.targetUserId, offer);
      }
    } catch (error) {
      console.error('📞 WebRTC: Create offer error:', error);
      throw error;
    }
  }

  /**
   * Handle incoming offer (receiver only)
   */
  async _handleRemoteOffer(offer, fromUserId) {
    try {
      console.log('📞 WebRTC: Handling remote offer from:', fromUserId);
      
      if (!this.peerConnection) {
        console.log('📞 WebRTC: Creating peer connection for offer...');
        await this._createPeerConnection();
        if (this.localStream) {
          this._addLocalTracks();
        }
      }

      this.targetUserId = fromUserId;

      // Set remote description (the offer)
      const rtcOffer = new RTCSessionDescription(offer);
      await this.peerConnection.setRemoteDescription(rtcOffer);
      console.log('📞 WebRTC: Remote description (offer) set');

      // Process any pending ICE candidates
      await this._processPendingCandidates();

      // Create and send answer
      await this._createAndSendAnswer();
    } catch (error) {
      console.error('📞 WebRTC: Handle offer error:', error);
    }
  }

  /**
   * Create and send SDP answer (receiver only)
   */
  async _createAndSendAnswer() {
    try {
      console.log('📞 WebRTC: Creating answer...');
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('📞 WebRTC: Answer created and local description set');

      // Send answer via socket
      if (this.socketService && this.targetUserId) {
        console.log('📞 WebRTC: Sending answer to:', this.targetUserId);
        this.socketService.sendWebRTCAnswer(this.targetUserId, answer);
      }
    } catch (error) {
      console.error('📞 WebRTC: Create answer error:', error);
      throw error;
    }
  }

  /**
   * Handle incoming answer (caller only)
   */
  async _handleRemoteAnswer(answer) {
    try {
      console.log('📞 WebRTC: Handling remote answer');
      
      if (!this.peerConnection) {
        console.error('📞 WebRTC: No peer connection for answer');
        return;
      }

      if (this.peerConnection.signalingState !== 'have-local-offer') {
        console.warn('📞 WebRTC: Wrong state for answer:', this.peerConnection.signalingState);
        return;
      }

      const rtcAnswer = new RTCSessionDescription(answer);
      await this.peerConnection.setRemoteDescription(rtcAnswer);
      console.log('📞 WebRTC: Remote description (answer) set');

      // Process any pending ICE candidates
      await this._processPendingCandidates();
    } catch (error) {
      console.error('📞 WebRTC: Handle answer error:', error);
    }
  }

  /**
   * Add ICE candidate
   */
  async _addIceCandidate(candidate) {
    try {
      if (!candidate) return;

      // Queue if not ready
      if (!this.peerConnection || !this.peerConnection.remoteDescription) {
        console.log('📞 WebRTC: Queuing ICE candidate (not ready)');
        this.pendingIceCandidates.push(candidate);
        return;
      }

      const rtcCandidate = new RTCIceCandidate(candidate);
      await this.peerConnection.addIceCandidate(rtcCandidate);
      console.log('📞 WebRTC: ICE candidate added');
    } catch (error) {
      console.error('📞 WebRTC: Add ICE candidate error:', error);
    }
  }

  /**
   * Process pending ICE candidates
   */
  async _processPendingCandidates() {
    console.log('📞 WebRTC: Processing', this.pendingIceCandidates.length, 'pending candidates');
    
    while (this.pendingIceCandidates.length > 0) {
      const candidate = this.pendingIceCandidates.shift();
      await this._addIceCandidate(candidate);
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
    InCallManager.setForceSpeakerphoneOn(this.isSpeakerOn);
    console.log('📞 WebRTC: Speaker:', this.isSpeakerOn);
    return this.isSpeakerOn;
  }

  /**
   * Check connection status
   */
  isConnected() {
    if (!this.peerConnection) return false;
    const state = this.peerConnection.iceConnectionState;
    return state === 'connected' || state === 'completed';
  }

  /**
   * Set callbacks
   */
  setCallbacks({onRemoteStream, onConnectionStateChange, onCallConnected, onCallEnded}) {
    this.onRemoteStreamCallback = onRemoteStream || null;
    this.onConnectionStateChangeCallback = onConnectionStateChange || null;
    this.onCallConnectedCallback = onCallConnected || null;
    this.onCallEndedCallback = onCallEnded || null;
  }

  /**
   * Cleanup everything
   */
  cleanup() {
    console.log('📞 WebRTC: Cleaning up...');

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
    try {
      InCallManager.stop();
    } catch (e) {
      console.log('InCallManager stop error:', e);
    }

    // Reset state
    this.remoteStream = null;
    this.isMuted = false;
    this.isSpeakerOn = false;
    this.isInitialized = false;
    this.targetUserId = null;
    this.callId = null;
    this.isCaller = false;
    this.pendingIceCandidates = [];

    console.log('📞 WebRTC: Cleanup complete');
  }
}

export const webRTCService = new WebRTCService();
export default webRTCService;