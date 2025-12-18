/**
 * WebRTC Service for Real-Time Voice Calls
 * This service handles actual peer-to-peer audio connections
 */

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';
import {store} from '../redux/store';
import {callConnected, callFailed, endCall} from '../redux/slices/callSlice';

// STUN/TURN servers for NAT traversal
const ICE_SERVERS = {
  iceServers: [
    {urls: 'stun:stun.l.google.com:19302'},
    {urls: 'stun:stun1.l.google.com:19302'},
    {urls: 'stun:stun2.l.google.com:19302'},
    {urls: 'stun:stun3.l.google.com:19302'},
    {urls: 'stun:stun4.l.google.com:19302'},
    // Free TURN server (for production, use your own)
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
  ],
};

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isMuted = false;
    this.isSpeakerOn = false;
    this.isInitialized = false;
    this.iceCandidatesQueue = [];
    this.socketService = null;
    this.targetUserId = null;
    this.callId = null;
    
    // Callbacks
    this.onRemoteStreamCallback = null;
    this.onConnectionStateChangeCallback = null;
    this.onCallConnectedCallback = null;
    this.onCallEndedCallback = null;
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

    // Listen for WebRTC offer (receiver side)
    this.socketService.setWebRTCCallbacks({
      onOffer: async (data) => {
        console.log('📞 WebRTC: Received offer from', data.from);
        await this._handleRemoteOffer(data.offer, data.from);
      },
      onAnswer: async (data) => {
        console.log('📞 WebRTC: Received answer from', data.from);
        await this._handleRemoteAnswer(data.answer);
      },
      onICECandidate: async (data) => {
        console.log('📞 WebRTC: Received ICE candidate');
        await this.addIceCandidate(data.candidate);
      },
    });
  }

  /**
   * Initialize WebRTC for outgoing call (caller)
   */
  async initializeAsCallerCall(targetUserId, callId) {
    try {
      console.log('📞 WebRTC: Initializing as caller');
      this.targetUserId = targetUserId;
      this.callId = callId;

      // Start InCallManager for audio routing
      InCallManager.start({media: 'audio'});
      InCallManager.setKeepScreenOn(true);
      InCallManager.setForceSpeakerphoneOn(false);

      // Create peer connection
      await this._createPeerConnection();

      // Get local audio stream
      await this._getLocalStream();

      // Create and send offer
      const offer = await this._createOffer();
      
      // Send offer via socket
      if (this.socketService) {
        this.socketService.sendWebRTCOffer(targetUserId, offer);
      }

      this.isInitialized = true;
      console.log('📞 WebRTC: Caller initialized, offer sent');
      return true;
    } catch (error) {
      console.error('📞 WebRTC: Initialize caller error:', error);
      this.cleanup();
      return false;
    }
  }

  /**
   * Initialize WebRTC for incoming call (receiver)
   */
  async initializeAsReceiverCall(targetUserId, callId) {
    try {
      console.log('📞 WebRTC: Initializing as receiver');
      this.targetUserId = targetUserId;
      this.callId = callId;

      // Start InCallManager
      InCallManager.start({media: 'audio'});
      InCallManager.setKeepScreenOn(true);
      InCallManager.setForceSpeakerphoneOn(false);

      // Create peer connection
      await this._createPeerConnection();

      // Get local audio stream
      await this._getLocalStream();

      this.isInitialized = true;
      console.log('📞 WebRTC: Receiver initialized, waiting for offer');
      return true;
    } catch (error) {
      console.error('📞 WebRTC: Initialize receiver error:', error);
      this.cleanup();
      return false;
    }
  }

  /**
   * Create RTCPeerConnection with proper configuration
   */
  async _createPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.socketService && this.targetUserId) {
        console.log('📞 WebRTC: Sending ICE candidate');
        this.socketService.sendICECandidate(this.targetUserId, event.candidate);
      }
    };

    // Handle ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection.iceConnectionState;
      console.log('📞 WebRTC: ICE connection state:', state);

      if (state === 'connected' || state === 'completed') {
        console.log('📞 WebRTC: Audio connection established!');
        if (this.onCallConnectedCallback) {
          this.onCallConnectedCallback();
        }
        store.dispatch(callConnected());
      } else if (state === 'failed' || state === 'disconnected') {
        console.log('📞 WebRTC: Connection failed/disconnected');
        if (this.onCallEndedCallback) {
          this.onCallEndedCallback('connection_failed');
        }
      }
    };

    // Handle connection state
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      console.log('📞 WebRTC: Connection state:', state);
      
      if (this.onConnectionStateChangeCallback) {
        this.onConnectionStateChangeCallback(state);
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      console.log('📞 WebRTC: Received remote track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        console.log('📞 WebRTC: Remote audio stream received!');
        
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(this.remoteStream);
        }
      }
    };

    // Process any queued ICE candidates
    while (this.iceCandidatesQueue.length > 0) {
      const candidate = this.iceCandidatesQueue.shift();
      await this.addIceCandidate(candidate);
    }

    console.log('📞 WebRTC: Peer connection created');
  }

  /**
   * Get local audio stream from microphone
   */
  async _getLocalStream() {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
        },
        video: false,
      };

      console.log('📞 WebRTC: Requesting microphone access...');
      this.localStream = await mediaDevices.getUserMedia(constraints);
      console.log('📞 WebRTC: Microphone access granted');

      // Add local tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        console.log('📞 WebRTC: Adding local track:', track.kind);
        this.peerConnection.addTrack(track, this.localStream);
      });

      return this.localStream;
    } catch (error) {
      console.error('📞 WebRTC: Get local stream error:', error);
      throw new Error('Failed to access microphone: ' + error.message);
    }
  }

  /**
   * Create SDP offer (caller side)
   */
  async _createOffer() {
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });

      await this.peerConnection.setLocalDescription(offer);
      console.log('📞 WebRTC: Offer created and set as local description');
      
      return offer;
    } catch (error) {
      console.error('📞 WebRTC: Create offer error:', error);
      throw error;
    }
  }

  /**
   * Handle incoming offer (receiver side)
   */
  async _handleRemoteOffer(offer, fromUserId) {
    try {
      console.log('📞 WebRTC: Handling remote offer');
      
      if (!this.peerConnection) {
        console.log('📞 WebRTC: Creating peer connection for incoming offer');
        await this._createPeerConnection();
        await this._getLocalStream();
      }

      this.targetUserId = fromUserId;

      // Set remote description
      const rtcOffer = new RTCSessionDescription(offer);
      await this.peerConnection.setRemoteDescription(rtcOffer);
      console.log('📞 WebRTC: Remote offer set');

      // Create and send answer
      const answer = await this._createAnswer();
      
      if (this.socketService) {
        this.socketService.sendWebRTCAnswer(fromUserId, answer);
      }

      console.log('📞 WebRTC: Answer sent');
    } catch (error) {
      console.error('📞 WebRTC: Handle remote offer error:', error);
    }
  }

  /**
   * Create SDP answer (receiver side)
   */
  async _createAnswer() {
    try {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      console.log('📞 WebRTC: Answer created');
      return answer;
    } catch (error) {
      console.error('📞 WebRTC: Create answer error:', error);
      throw error;
    }
  }

  /**
   * Handle incoming answer (caller side)
   */
  async _handleRemoteAnswer(answer) {
    try {
      console.log('📞 WebRTC: Handling remote answer');
      
      if (!this.peerConnection) {
        console.error('📞 WebRTC: No peer connection for answer');
        return;
      }

      const rtcAnswer = new RTCSessionDescription(answer);
      await this.peerConnection.setRemoteDescription(rtcAnswer);
      console.log('📞 WebRTC: Remote answer set - connection should establish');
    } catch (error) {
      console.error('📞 WebRTC: Handle remote answer error:', error);
    }
  }

  /**
   * Add ICE candidate from remote peer
   */
  async addIceCandidate(candidate) {
    try {
      if (!candidate) return;

      if (!this.peerConnection || !this.peerConnection.remoteDescription) {
        // Queue candidate if peer connection not ready
        console.log('📞 WebRTC: Queuing ICE candidate');
        this.iceCandidatesQueue.push(candidate);
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
   * Toggle microphone mute
   */
  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isMuted = !audioTrack.enabled;
        console.log('📞 WebRTC: Mute:', this.isMuted);
        return this.isMuted;
      }
    }
    return this.isMuted;
  }

  /**
   * Set mute state
   */
  setMute(muted) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !muted;
        this.isMuted = muted;
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
   * Set speaker state
   */
  setSpeaker(enabled) {
    this.isSpeakerOn = enabled;
    InCallManager.setForceSpeakerphoneOn(enabled);
    return this.isSpeakerOn;
  }

  /**
   * Check if connected
   */
  isConnected() {
    if (!this.peerConnection) return false;
    const state = this.peerConnection.iceConnectionState;
    return state === 'connected' || state === 'completed';
  }

  /**
   * Get connection stats
   */
  async getStats() {
    if (!this.peerConnection) return null;

    try {
      const stats = await this.peerConnection.getStats();
      const result = {
        packetsReceived: 0,
        packetsSent: 0,
        packetsLost: 0,
        bytesReceived: 0,
        bytesSent: 0,
        jitter: 0,
      };

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          result.packetsReceived = report.packetsReceived || 0;
          result.packetsLost = report.packetsLost || 0;
          result.bytesReceived = report.bytesReceived || 0;
          result.jitter = report.jitter || 0;
        }
        if (report.type === 'outbound-rtp' && report.kind === 'audio') {
          result.packetsSent = report.packetsSent || 0;
          result.bytesSent = report.bytesSent || 0;
        }
      });

      return result;
    } catch (error) {
      console.error('📞 WebRTC: Get stats error:', error);
      return null;
    }
  }

  /**
   * End call and cleanup
   */
  cleanup() {
    console.log('📞 WebRTC: Cleaning up...');

    // Stop local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
        console.log('📞 WebRTC: Stopped local track:', track.kind);
      });
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Stop InCallManager
    InCallManager.stop();

    // Reset state
    this.remoteStream = null;
    this.isMuted = false;
    this.isSpeakerOn = false;
    this.isInitialized = false;
    this.targetUserId = null;
    this.callId = null;
    this.iceCandidatesQueue = [];

    console.log('📞 WebRTC: Cleanup complete');
  }

  /**
   * Set callbacks
   */
  setCallbacks({onRemoteStream, onConnectionStateChange, onCallConnected, onCallEnded}) {
    this.onRemoteStreamCallback = onRemoteStream;
    this.onConnectionStateChangeCallback = onConnectionStateChange;
    this.onCallConnectedCallback = onCallConnected;
    this.onCallEndedCallback = onCallEnded;
  }
}

export const webRTCService = new WebRTCService();
export default webRTCService;