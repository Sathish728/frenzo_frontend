/**
 * WebRTC Service for Real-Time Voice Calls
 */

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
} from 'react-native-webrtc';

// ICE Server configuration for NAT traversal
const ICE_SERVERS = {
  iceServers: [
    {urls: 'stun:stun.l.google.com:19302'},
    {urls: 'stun:stun1.l.google.com:19302'},
    {urls: 'stun:stun2.l.google.com:19302'},
    {urls: 'stun:stun3.l.google.com:19302'},
    {urls: 'stun:stun4.l.google.com:19302'},
  ],
};

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isMuted = false;
    this.isSpeakerOn = false;
    this.onRemoteStream = null;
    this.onConnectionStateChange = null;
    this.onIceCandidate = null;
  }

  /**
   * Initialize WebRTC peer connection
   */
  async initialize() {
    try {
      // Create peer connection
      this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.onIceCandidate) {
          this.onIceCandidate(event.candidate);
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection.connectionState;
        console.log('WebRTC connection state:', state);
        
        if (this.onConnectionStateChange) {
          this.onConnectionStateChange(state);
        }
      };

      // Handle ICE connection state
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', this.peerConnection.iceConnectionState);
      };

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('Remote track received:', event.track.kind);
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
          if (this.onRemoteStream) {
            this.onRemoteStream(this.remoteStream);
          }
        }
      };

      console.log('WebRTC initialized successfully');
      return true;
    } catch (error) {
      console.error('WebRTC initialization error:', error);
      return false;
    }
  }

  /**
   * Get local audio stream (microphone)
   */
  async getLocalStream() {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false, // Audio only for voice calls
      };

      this.localStream = await mediaDevices.getUserMedia(constraints);
      
      // Add tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      console.log('Local audio stream obtained');
      return this.localStream;
    } catch (error) {
      console.error('Get local stream error:', error);
      throw error;
    }
  }

  /**
   * Create offer (caller side)
   */
  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      
      await this.peerConnection.setLocalDescription(offer);
      
      console.log('Offer created');
      return offer;
    } catch (error) {
      console.error('Create offer error:', error);
      throw error;
    }
  }

  /**
   * Create answer (receiver side)
   */
  async createAnswer() {
    try {
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      console.log('Answer created');
      return answer;
    } catch (error) {
      console.error('Create answer error:', error);
      throw error;
    }
  }

  /**
   * Set remote description (received offer/answer)
   */
  async setRemoteDescription(description) {
    try {
      const rtcDescription = new RTCSessionDescription(description);
      await this.peerConnection.setRemoteDescription(rtcDescription);
      
      console.log('Remote description set');
    } catch (error) {
      console.error('Set remote description error:', error);
      throw error;
    }
  }

  /**
   * Add ICE candidate received from remote peer
   */
  async addIceCandidate(candidate) {
    try {
      if (this.peerConnection && candidate) {
        const rtcCandidate = new RTCIceCandidate(candidate);
        await this.peerConnection.addIceCandidate(rtcCandidate);
        console.log('ICE candidate added');
      }
    } catch (error) {
      console.error('Add ICE candidate error:', error);
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
        console.log('Mute toggled:', this.isMuted);
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
        console.log('Mute set to:', muted);
      }
    }
    return this.isMuted;
  }

  /**
   * Toggle speaker (requires InCallManager or similar)
   */
  toggleSpeaker() {
    this.isSpeakerOn = !this.isSpeakerOn;
    console.log('Speaker toggled:', this.isSpeakerOn);
    return this.isSpeakerOn;
  }

  /**
   * Set speaker state
   */
  setSpeaker(enabled) {
    this.isSpeakerOn = enabled;
    console.log('Speaker set to:', enabled);
    return this.isSpeakerOn;
  }

  /**
   * Get connection state
   */
  getConnectionState() {
    return this.peerConnection?.connectionState || 'disconnected';
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.peerConnection?.connectionState === 'connected';
  }

  /**
   * End call and cleanup
   */
  async endCall() {
    try {
      // Stop local stream
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

      this.remoteStream = null;
      this.isMuted = false;
      this.isSpeakerOn = false;

      console.log('WebRTC call ended and cleaned up');
    } catch (error) {
      console.error('End call error:', error);
    }
  }

  /**
   * Get call statistics
   */
  async getStats() {
    if (!this.peerConnection) return null;

    try {
      const stats = await this.peerConnection.getStats();
      const result = {};

      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          result.packetsReceived = report.packetsReceived;
          result.packetsLost = report.packetsLost;
          result.jitter = report.jitter;
        }
        if (report.type === 'outbound-rtp' && report.kind === 'audio') {
          result.packetsSent = report.packetsSent;
          result.bytesSent = report.bytesSent;
        }
      });

      return result;
    } catch (error) {
      console.error('Get stats error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const webRTCService = new WebRTCService();
export default webRTCService;