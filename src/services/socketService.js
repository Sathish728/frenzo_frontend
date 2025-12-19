/**
 * Socket Service for FrndZone - V3 FIXED
 * 
 * Properly handles your backend events:
 * - prepare_webrtc (for receiver)
 * - create_offer (for caller) 
 * - call_answered
 * - webrtc_offer/answer/ice_candidate
 */

import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/constants';
import { store } from '../redux/store';
import { setAvailableWomen, updateWomanStatus } from '../redux/slices/userSlice';
import { updateCoins } from '../redux/slices/authSlice';
import {
  receiveCall,
  callAnswered,
  callConnected,
  endCall,
  callFailed,
  updateDuration,
} from '../redux/slices/callSlice';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.heartbeatInterval = null;
    
    // Callbacks for WebRTC events - set by call screens
    this.onPrepareWebRTC = null;  // For receiver
    this.onCreateOffer = null;    // For caller
    this.onWebRTCOffer = null;
    this.onWebRTCAnswer = null;
    this.onICECandidate = null;
    this.onCallAnsweredCallback = null;
    this.onCallEndedCallback = null;
    this.onCoinUpdate = null;
  }

  /**
   * Set callbacks from call screens
   */
  setCallbacks(callbacks) {
    if (callbacks.onPrepareWebRTC) this.onPrepareWebRTC = callbacks.onPrepareWebRTC;
    if (callbacks.onCreateOffer) this.onCreateOffer = callbacks.onCreateOffer;
    if (callbacks.onWebRTCOffer) this.onWebRTCOffer = callbacks.onWebRTCOffer;
    if (callbacks.onWebRTCAnswer) this.onWebRTCAnswer = callbacks.onWebRTCAnswer;
    if (callbacks.onICECandidate) this.onICECandidate = callbacks.onICECandidate;
    if (callbacks.onCallAnswered) this.onCallAnsweredCallback = callbacks.onCallAnswered;
    if (callbacks.onCallEnded) this.onCallEndedCallback = callbacks.onCallEnded;
    if (callbacks.onCoinUpdate) this.onCoinUpdate = callbacks.onCoinUpdate;
  }

  clearCallbacks() {
    this.onPrepareWebRTC = null;
    this.onCreateOffer = null;
    this.onWebRTCOffer = null;
    this.onWebRTCAnswer = null;
    this.onICECandidate = null;
    this.onCallAnsweredCallback = null;
    this.onCallEndedCallback = null;
    this.onCoinUpdate = null;
  }

  connect(token) {
    if (this.socket?.connected) {
      console.log('🔌 Socket already connected');
      return;
    }

    console.log('🔌 Connecting to:', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    this._setupListeners();
  }

  _setupListeners() {
    if (!this.socket) return;

    // Connection
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.isConnected = true;

      const state = store.getState();
      const userId = state.auth.user?.id || state.auth.user?._id;
      if (userId) {
        this.socket.emit('user_online', userId);
        console.log('📡 User online:', userId);
      }

      this._startHeartbeat();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason);
      this.isConnected = false;
      this._stopHeartbeat();
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚨 Connection error:', error.message);
    });

    this.socket.on('reconnect', () => {
      console.log('🔄 Reconnected');
      const state = store.getState();
      const userId = state.auth.user?.id || state.auth.user?._id;
      if (userId) {
        this.socket.emit('user_online', userId);
      }
    });

    // Women list
    this.socket.on('women_list_updated', (data) => {
      const women = Array.isArray(data) ? data : (data.women || []);
      store.dispatch(setAvailableWomen(women));
    });

    this.socket.on('woman_status_changed', (data) => {
      store.dispatch(updateWomanStatus(data));
    });

    // Coins
    this.socket.on('coins_updated', (data) => {
      console.log('💰 Coins:', data);
      store.dispatch(updateCoins(data.coins));
      if (this.onCoinUpdate) {
        this.onCoinUpdate(data);
      }
    });

    // ========== INCOMING CALL (for women) ==========
    this.socket.on('incoming_call', (data) => {
      console.log('📞📞📞 INCOMING CALL:', JSON.stringify(data));
      
      const caller = data.caller || {
        _id: data.menUserId,
        name: data.menName || 'Unknown',
        profileImage: data.profileImage || null,
      };

      store.dispatch(receiveCall({
        caller,
        callId: data.callId || data.tempCallId,
      }));
    });

    // ========== PREPARE WEBRTC (for receiver/woman) ==========
    this.socket.on('prepare_webrtc', (data) => {
      console.log('📞 PREPARE_WEBRTC:', data);
      if (this.onPrepareWebRTC) {
        this.onPrepareWebRTC(data);
      } else {
        console.warn('⚠️ No prepare_webrtc handler!');
      }
    });

    // ========== CALL ANSWERED (for caller/man) ==========
    this.socket.on('call_answered', (data) => {
      console.log('📞 CALL_ANSWERED:', data);
      store.dispatch(callAnswered({ callId: data.callId }));
      if (this.onCallAnsweredCallback) {
        this.onCallAnsweredCallback(data);
      }
    });

    // ========== CREATE OFFER (for caller - after receiver is ready) ==========
    this.socket.on('create_offer', (data) => {
      console.log('📞 CREATE_OFFER:', data);
      if (this.onCreateOffer) {
        this.onCreateOffer(data);
      } else {
        console.warn('⚠️ No create_offer handler!');
      }
    });

    // ========== CALL CONNECTED ==========
    this.socket.on('call_connected', (data) => {
      console.log('📞 CALL_CONNECTED');
      store.dispatch(callConnected());
    });

    // ========== CALL DURATION ==========
    this.socket.on('call_duration_update', (data) => {
      store.dispatch(updateDuration({
        duration: data.duration,
        coinsUsed: data.coinsUsed,
        coinsEarned: data.coinsEarned,
      }));
    });

    // ========== CALL ENDED ==========
    this.socket.on('call_ended', (data) => {
      console.log('📞 CALL_ENDED:', data);
      store.dispatch(endCall({
        reason: data.reason || 'ended',
        duration: data.duration,
        coinsUsed: data.coinsUsed,
        coinsEarned: data.coinsEarned,
      }));
      if (this.onCallEndedCallback) {
        this.onCallEndedCallback(data);
      }
    });

    // Call failures
    this.socket.on('call_rejected', (data) => {
      console.log('📞 Rejected:', data);
      store.dispatch(callFailed({ reason: 'rejected' }));
    });

    this.socket.on('call_failed', (data) => {
      console.log('📞 Failed:', data);
      store.dispatch(callFailed({ reason: data.reason || 'failed' }));
    });

    this.socket.on('user_busy', (data) => {
      console.log('📞 Busy:', data);
      store.dispatch(callFailed({ reason: 'busy' }));
    });

    this.socket.on('insufficient_coins', (data) => {
      console.log('💰 Insufficient:', data);
      store.dispatch(callFailed({ reason: 'insufficient_coins' }));
    });

    this.socket.on('no_answer', (data) => {
      console.log('📞 No answer');
      store.dispatch(callFailed({ reason: 'no_answer' }));
    });

    // ========== WEBRTC SIGNALING ==========
    this.socket.on('webrtc_offer', (data) => {
      console.log('🎥 OFFER from:', data.fromUserId);
      if (this.onWebRTCOffer) {
        this.onWebRTCOffer(data);
      } else {
        console.warn('⚠️ No webrtc_offer handler!');
      }
    });

    this.socket.on('webrtc_answer', (data) => {
      console.log('🎥 ANSWER from:', data.fromUserId);
      if (this.onWebRTCAnswer) {
        this.onWebRTCAnswer(data);
      } else {
        console.warn('⚠️ No webrtc_answer handler!');
      }
    });

    this.socket.on('ice_candidate', (data) => {
      if (this.onICECandidate) {
        this.onICECandidate(data);
      }
    });

    this.socket.on('pong', () => {});
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 25000);
  }

  _stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ========== CALL METHODS ==========
  initiateCall(womanId) {
    if (!this.socket?.connected) return false;
    console.log('📞 Initiating call to:', womanId);
    this.socket.emit('initiate_call', { womanId });
    return true;
  }

  answerCall(callId) {
    if (!this.socket?.connected) return false;
    console.log('📞 Answering:', callId);
    this.socket.emit('answer_call', { callId });
    return true;
  }

  declineCall(callId, reason = 'declined') {
    if (!this.socket?.connected) return false;
    this.socket.emit('reject_call', { callId, reason });
    return true;
  }

  endCall(callId, reason = 'user_ended') {
    if (!this.socket?.connected) return false;
    this.socket.emit('end_call', { callId, reason });
    return true;
  }

  // Tell server receiver is ready for offer
  signalWebRTCReady(callId) {
    if (!this.socket?.connected) return false;
    console.log('📞 Signaling webrtc_ready');
    this.socket.emit('webrtc_ready', { callId });
    return true;
  }

  // Tell server call is connected (for coin deduction)
  signalCallConnected(callId) {
    if (!this.socket?.connected) return false;
    console.log('📞 Signaling call_connected_ack');
    this.socket.emit('call_connected_ack', { callId });
    return true;
  }

  // ========== WEBRTC SIGNALING ==========
  sendWebRTCOffer(targetUserId, offer) {
    if (!this.socket?.connected) return false;
    console.log('🎥 Sending OFFER to:', targetUserId);
    this.socket.emit('webrtc_offer', { targetUserId, offer });
    return true;
  }

  sendWebRTCAnswer(targetUserId, answer) {
    if (!this.socket?.connected) return false;
    console.log('🎥 Sending ANSWER to:', targetUserId);
    this.socket.emit('webrtc_answer', { targetUserId, answer });
    return true;
  }

  sendICECandidate(targetUserId, candidate) {
    if (!this.socket?.connected) return false;
    this.socket.emit('ice_candidate', { targetUserId, candidate });
    return true;
  }

  // Availability
  setAvailability(isAvailable) {
    if (!this.socket?.connected) return false;
    this.socket.emit('set_availability', { isAvailable });
    return true;
  }

  isSocketConnected() {
    return this.socket?.connected || false;
  }

  disconnect() {
    this._stopHeartbeat();
    this.clearCallbacks();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  reconnect() {
    this.disconnect();
    const state = store.getState();
    const token = state.auth.token;
    if (token) {
      setTimeout(() => this.connect(token), 1000);
    }
  }
}

export const socketService = new SocketService();
export default socketService;