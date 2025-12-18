// Call configuration
export const CALL_RATES = {
  coinsPerMinute: 10, // Coins deducted from men / earned by women per minute
  minimumCoins: 10,   // Minimum coins needed to start a call
  callTimeout: 30000, // 30 seconds timeout for no answer
};

// WebRTC configuration
export const WEBRTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
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

// Audio constraints for WebRTC
export const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 44100,
  channelCount: 1,
};

export default {
  CALL_RATES,
  WEBRTC_CONFIG,
  AUDIO_CONSTRAINTS,
};