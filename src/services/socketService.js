/**
 * Socket Service for FrndZone - PRODUCTION FIXED VERSION
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
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.heartbeatInterval = null;
    
    // All callbacks in one object
    this.callbacks = {
      onWebRTCOffer: null,
      onWebRTCAnswer: null,
      onICECandidate: null,
      onPrepareWebRTC: null,
      onCreateOffer: null,
      onCallAnswered: null,
      onCallEnded: null,
      onCoinUpdate: null,
    };
  }

  /**
   * Set a single callback
   */
  setCallback(name, callback) {
    if (this.callbacks.hasOwnProperty(name)) {
      this.callbacks[name] = callback;
    }
  }

  /**
   * Connect to socket server
   */
  connect(token) {
    if (this.socket?.connected) {
      console.log('🔌 Socket already connected');
      return;
    }

    console.log('🔌 Connecting to socket:', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,
    });

    this.setupListeners();
  }

  /**
   * Setup all socket event listeners
   */
  setupListeners() {
    if (!this.socket) return;

    // ========== CONNECTION EVENTS ==========
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;

      const state = store.getState();
      const userId = state.auth.user?.id || state.auth.user?._id;
      if (userId) {
        this.socket.emit('user_online', userId);
        console.log('📡 Registered online:', userId);
      }

      this.startHeartbeat();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.isConnected = false;
      this.stopHeartbeat();
      
      if (reason === 'io server disconnect') {
        setTimeout(() => this.socket?.connect(), 1000);
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚨 Socket connection error:', error.message);
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
      const state = store.getState();
      const userId = state.auth.user?.id || state.auth.user?._id;
      if (userId) {
        this.socket.emit('user_online', userId);
      }
    });

    this.socket.on('pong', () => {});

    // ========== USER STATUS ==========
    this.socket.on('women_list_updated', (data) => {
      console.log('👥 Women list updated');
      const women = Array.isArray(data) ? data : (data.women || []);
      store.dispatch(setAvailableWomen(women));
    });

    this.socket.on('woman_status_changed', (data) => {
      console.log('👤 Woman status changed:', data);
      store.dispatch(updateWomanStatus(data));
    });

    // ========== COINS ==========
    this.socket.on('coins_updated', (data) => {
      console.log('💰 Coins updated:', data.coins);
      store.dispatch(updateCoins(data.coins));
      if (this.callbacks.onCoinUpdate) {
        this.callbacks.onCoinUpdate(data);
      }
    });

    // ========== INCOMING CALL (for women) ==========
    this.socket.on('incoming_call', (data) => {
      console.log('📞 INCOMING CALL:', JSON.stringify(data));
      
      const caller = data.caller || {
        _id: data.menUserId,
        name: data.menName || 'Unknown',
        profileImage: data.profileImage || null,
      };

      store.dispatch(
        receiveCall({
          caller: caller,
          callId: data.callId || data.tempCallId,
        }),
      );
    });

    // ========== PREPARE WEBRTC (for receiver/woman) ==========
    this.socket.on('prepare_webrtc', (data) => {
      console.log('📞 PREPARE_WEBRTC received:', data);
      if (this.callbacks.onPrepareWebRTC) {
        this.callbacks.onPrepareWebRTC(data);
      }
    });

    // ========== CREATE OFFER (for caller) ==========
    this.socket.on('create_offer', (data) => {
      console.log('📞 CREATE_OFFER received:', data);
      if (this.callbacks.onCreateOffer) {
        this.callbacks.onCreateOffer(data);
      }
    });

    // ========== CALL ANSWERED (for caller - men) ==========
    this.socket.on('call_answered', (data) => {
      console.log('📞 CALL_ANSWERED received:', data);
      store.dispatch(callAnswered({ callId: data.callId }));
      
      if (this.callbacks.onCallAnswered) {
        this.callbacks.onCallAnswered(data);
      }
    });

    // ========== CALL CONNECTED ==========
    this.socket.on('call_connected', (data) => {
      console.log('📞 CALL_CONNECTED received:', data);
      store.dispatch(callConnected());
    });

    // ========== CALL DURATION UPDATE ==========
    this.socket.on('call_duration_update', (data) => {
      console.log('⏱️ Duration update:', data);
      store.dispatch(
        updateDuration({
          duration: data.duration,
          coinsUsed: data.coinsUsed,
          coinsEarned: data.coinsEarned,
        }),
      );
    });

    // ========== CALL ENDED ==========
    this.socket.on('call_ended', (data) => {
      console.log('📞 CALL_ENDED received:', data);
      store.dispatch(
        endCall({
          reason: data.reason || 'ended',
          duration: data.duration,
          coinsUsed: data.coinsUsed,
          coinsEarned: data.coinsEarned,
        }),
      );
      if (this.callbacks.onCallEnded) {
        this.callbacks.onCallEnded(data);
      }
    });

    // ========== CALL EVENTS ==========
    this.socket.on('call_missed', (data) => {
      console.log('📞 Call missed:', data);
    });

    this.socket.on('call_rejected', (data) => {
      console.log('📞 Call rejected:', data);
      store.dispatch(callFailed({ reason: 'rejected', error: data.message }));
    });

    this.socket.on('call_failed', (data) => {
      console.log('📞 Call failed:', data);
      store.dispatch(callFailed({ reason: data.reason || 'failed', error: data.message }));
    });

    this.socket.on('user_busy', (data) => {
      console.log('📞 User busy:', data);
      store.dispatch(callFailed({ reason: 'busy', error: data.message }));
    });

    this.socket.on('insufficient_coins', (data) => {
      console.log('💰 Insufficient coins:', data);
      store.dispatch(callFailed({ reason: 'insufficient_coins', error: data.message }));
    });

    this.socket.on('no_answer', (data) => {
      console.log('📞 No answer:', data);
      store.dispatch(callFailed({ reason: 'no_answer', error: 'No answer' }));
    });

    // ========== WEBRTC SIGNALING ==========
    this.socket.on('webrtc_offer', (data) => {
      console.log('🎥 WebRTC OFFER received from:', data.fromUserId);
      if (this.callbacks.onWebRTCOffer) {
        this.callbacks.onWebRTCOffer(data);
      }
    });

    this.socket.on('webrtc_answer', (data) => {
      console.log('🎥 WebRTC ANSWER received from:', data.fromUserId);
      if (this.callbacks.onWebRTCAnswer) {
        this.callbacks.onWebRTCAnswer(data);
      }
    });

    this.socket.on('ice_candidate', (data) => {
      console.log('🎥 ICE candidate received');
      if (this.callbacks.onICECandidate) {
        this.callbacks.onICECandidate(data);
      }
    });
  }

  // ========== HEARTBEAT ==========
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 25000);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ========== CALL METHODS ==========
  initiateCall(womanId) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Initiating call to:', womanId);
    this.socket.emit('initiate_call', { womanId });
    return true;
  }

  answerCall(callId) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Answering call:', callId);
    this.socket.emit('answer_call', { callId });
    return true;
  }

  declineCall(callId, reason = 'declined') {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Declining call:', callId);
    this.socket.emit('reject_call', { callId, reason });
    return true;
  }

  endCall(callId, reason = 'user_ended') {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Ending call:', callId);
    this.socket.emit('end_call', { callId, reason });
    return true;
  }

  signalWebRTCReady(callId) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Signaling WebRTC ready for call:', callId);
    this.socket.emit('webrtc_ready', { callId });
    return true;
  }

  signalCallConnected(callId) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Signaling call connected:', callId);
    this.socket.emit('call_connected_ack', { callId });
    return true;
  }

  // ========== WEBRTC SIGNALING METHODS ==========
  sendWebRTCOffer(targetUserId, offer) {
    if (!this.socket?.connected) {
      console.error('Socket not connected for WebRTC offer');
      return false;
    }
    console.log('🎥 SENDING WebRTC offer to:', targetUserId);
    this.socket.emit('webrtc_offer', { targetUserId, offer });
    return true;
  }

  sendWebRTCAnswer(targetUserId, answer) {
    if (!this.socket?.connected) {
      console.error('Socket not connected for WebRTC answer');
      return false;
    }
    console.log('🎥 SENDING WebRTC answer to:', targetUserId);
    this.socket.emit('webrtc_answer', { targetUserId, answer });
    return true;
  }

  sendICECandidate(targetUserId, candidate) {
    if (!this.socket?.connected) {
      console.error('Socket not connected for ICE candidate');
      return false;
    }
    this.socket.emit('ice_candidate', { targetUserId, candidate });
    return true;
  }

  // ========== AVAILABILITY ==========
  setAvailability(isAvailable) {
    if (!this.socket?.connected) return false;
    console.log('🔄 Setting availability:', isAvailable);
    this.socket.emit('set_availability', { isAvailable });
    return true;
  }

  // ========== UTILITY ==========
  isSocketConnected() {
    return this.socket?.connected || false;
  }

  getSocketId() {
    return this.socket?.id || null;
  }

  disconnect() {
    this.stopHeartbeat();
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
