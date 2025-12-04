// src/services/webrtc.service.js
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from 'react-native-webrtc';
import socketService from './socket.service';

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.iceServers = null;
    this.isInitialized = false;
  }

  /**
   * Initialize WebRTC with ICE servers
   */
  initialize(iceServers) {
    this.iceServers = iceServers;
    this.isInitialized = true;
    console.log('WebRTC initialized with ICE servers');
  }

  /**
   * Get user media (audio only for voice call)
   */
  async getUserMedia() {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      console.log('Got user media stream');
      return stream;
    } catch (error) {
      console.error('Get user media error:', error);
      throw new Error('Failed to access microphone');
    }
  }

  /**
   * Create peer connection
   */
  createPeerConnection(onRemoteStream, targetUserId) {
    try {
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers,
      });

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Sending ICE candidate');
          socketService.emit('ice_candidate', {
            targetUserId,
            candidate: event.candidate,
          });
        }
      };

      // Handle remote stream
      this.peerConnection.onaddstream = (event) => {
        console.log('Received remote stream');
        this.remoteStream = event.stream;
        if (onRemoteStream) {
          onRemoteStream(event.stream);
        }
      };

      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', this.peerConnection.connectionState);
      };

      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE state:', this.peerConnection.iceConnectionState);
      };

      return this.peerConnection;
    } catch (error) {
      console.error('Create peer connection error:', error);
      throw error;
    }
  }

  /**
   * Start call (for men - caller)
   */
  async startCall(menUserId, womenUserId, onRemoteStream) {
    try {
      console.log('Starting call...');

      // Get local audio stream
      this.localStream = await this.getUserMedia();

      // Create peer connection
      this.createPeerConnection(onRemoteStream, womenUserId);

      // Add local stream to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Create offer
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
      });

      await this.peerConnection.setLocalDescription(offer);

      console.log('Offer created, sending call request');

      // Send call request to server
      socketService.emit('call_request', {
        menUserId,
        womenUserId,
        offer: offer,
      });

      return this.localStream;
    } catch (error) {
      console.error('Start call error:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Answer call (for women - receiver)
   */
  async answerCall(menUserId, offer, onRemoteStream) {
    try {
      console.log('Answering call...');

      // Get local audio stream
      this.localStream = await this.getUserMedia();

      // Create peer connection
      this.createPeerConnection(onRemoteStream, menUserId);

      // Add local stream
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Set remote description (offer)
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      );

      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      console.log('Answer created');

      return {
        answer,
        localStream: this.localStream,
      };
    } catch (error) {
      console.error('Answer call error:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Handle answer from callee
   */
  async handleAnswer(answer) {
    try {
      console.log('Handling answer');
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      );
    } catch (error) {
      console.error('Handle answer error:', error);
      throw error;
    }
  }

  /**
   * Handle ICE candidate
   */
  async handleIceCandidate(candidate) {
    try {
      if (this.peerConnection && candidate) {
        console.log('Adding ICE candidate');
        await this.peerConnection.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      }
    } catch (error) {
      console.error('Handle ICE candidate error:', error);
    }
  }

  /**
   * Mute/unmute local audio
   */
  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return true;
  }

  /**
   * Toggle speaker
   */
  toggleSpeaker() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack._switchSpeaker(!audioTrack._speakerOn);
        return audioTrack._speakerOn;
      }
    }
    return false;
  }

  /**
   * End call and cleanup
   */
  endCall(callId) {
    console.log('Ending call');
    
    if (callId) {
      socketService.emit('call_ended', { callId });
    }

    this.cleanup();
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    console.log('Cleaning up WebRTC resources');

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
  }

  /**
   * Get connection stats
   */
  async getStats() {
    if (this.peerConnection) {
      try {
        const stats = await this.peerConnection.getStats();
        return stats;
      } catch (error) {
        console.error('Get stats error:', error);
        return null;
      }
    }
    return null;
  }
}

export default new WebRTCService();