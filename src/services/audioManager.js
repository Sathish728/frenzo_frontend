/**
 * Audio Manager Service for Voice Calls
 * 
 * Handles:
 * - Speaker/Earpiece switching
 * - Audio focus management
 * - Proximity sensor (screen off when near ear)
 * - Ringtone and vibration
 */

import {Platform, NativeModules} from 'react-native';

// Try to import InCallManager if available
let InCallManager = null;
try {
  InCallManager = require('react-native-incall-manager').default;
} catch (e) {
  console.log('InCallManager not available, using fallback');
}

class AudioManagerService {
  constructor() {
    this.isStarted = false;
    this.isSpeakerOn = false;
    this.isMuted = false;
  }

  /**
   * Start audio session for outgoing call
   */
  startCall() {
    if (InCallManager) {
      try {
        InCallManager.start({media: 'audio'});
        InCallManager.setKeepScreenOn(true);
        InCallManager.setForceSpeakerphoneOn(false);
        this.isStarted = true;
        console.log('🔊 Audio session started for outgoing call');
      } catch (error) {
        console.error('Start call audio error:', error);
      }
    }
  }

  /**
   * Start audio session for incoming call with ringtone
   */
  startRingtone() {
    if (InCallManager) {
      try {
        InCallManager.startRingtone('_DEFAULT_');
        this.isStarted = true;
        console.log('🔔 Ringtone started');
      } catch (error) {
        console.error('Start ringtone error:', error);
      }
    }
  }

  /**
   * Stop ringtone
   */
  stopRingtone() {
    if (InCallManager) {
      try {
        InCallManager.stopRingtone();
        console.log('🔕 Ringtone stopped');
      } catch (error) {
        console.error('Stop ringtone error:', error);
      }
    }
  }

  /**
   * Answer call - switch from ringtone to call mode
   */
  answerCall() {
    if (InCallManager) {
      try {
        InCallManager.stopRingtone();
        InCallManager.start({media: 'audio'});
        InCallManager.setKeepScreenOn(true);
        InCallManager.setForceSpeakerphoneOn(false);
        this.isStarted = true;
        console.log('🔊 Audio session started for answered call');
      } catch (error) {
        console.error('Answer call audio error:', error);
      }
    }
  }

  /**
   * End call and cleanup audio
   */
  endCall() {
    if (InCallManager) {
      try {
        InCallManager.stop();
        InCallManager.setKeepScreenOn(false);
        this.isStarted = false;
        this.isSpeakerOn = false;
        this.isMuted = false;
        console.log('🔇 Audio session ended');
      } catch (error) {
        console.error('End call audio error:', error);
      }
    }
  }

  /**
   * Toggle speaker on/off
   */
  toggleSpeaker() {
    if (InCallManager) {
      try {
        this.isSpeakerOn = !this.isSpeakerOn;
        InCallManager.setForceSpeakerphoneOn(this.isSpeakerOn);
        console.log('🔊 Speaker:', this.isSpeakerOn ? 'ON' : 'OFF');
        return this.isSpeakerOn;
      } catch (error) {
        console.error('Toggle speaker error:', error);
      }
    }
    return this.isSpeakerOn;
  }

  /**
   * Set speaker state
   */
  setSpeaker(enabled) {
    if (InCallManager) {
      try {
        this.isSpeakerOn = enabled;
        InCallManager.setForceSpeakerphoneOn(enabled);
        console.log('🔊 Speaker set to:', enabled);
      } catch (error) {
        console.error('Set speaker error:', error);
      }
    }
    return this.isSpeakerOn;
  }

  /**
   * Toggle mute (this is handled by WebRTC, but we track state here)
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    console.log('🎤 Mute:', this.isMuted ? 'ON' : 'OFF');
    return this.isMuted;
  }

  /**
   * Set mute state
   */
  setMute(muted) {
    this.isMuted = muted;
    console.log('🎤 Mute set to:', muted);
    return this.isMuted;
  }

  /**
   * Enable proximity sensor (screen off when near ear)
   */
  enableProximitySensor() {
    if (InCallManager) {
      try {
        InCallManager.turnScreenOn();
        // Proximity sensor is automatically managed by InCallManager
        console.log('📱 Proximity sensor enabled');
      } catch (error) {
        console.error('Enable proximity error:', error);
      }
    }
  }

  /**
   * Disable proximity sensor
   */
  disableProximitySensor() {
    if (InCallManager) {
      try {
        InCallManager.turnScreenOn();
        console.log('📱 Proximity sensor disabled');
      } catch (error) {
        console.error('Disable proximity error:', error);
      }
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isStarted: this.isStarted,
      isSpeakerOn: this.isSpeakerOn,
      isMuted: this.isMuted,
    };
  }

  /**
   * Check if InCallManager is available
   */
  isAvailable() {
    return InCallManager !== null;
  }
}

export const audioManager = new AudioManagerService();
export default audioManager;