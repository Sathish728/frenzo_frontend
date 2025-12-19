/**
 * Socket Service for FrndZone - FULLY FIXED VERSION
 * 
 * CRITICAL FIXES:
 * 1. Added 'prepare_webrtc' and 'create_offer' handlers for proper timing
 * 2. Fixed WebRTC signaling order
 * 3. Added 'call_connected_ack' to confirm audio connection
 * 4. Better error handling and reconnection
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
    
    // WebRTC signaling callbacks
    this.onWebRTCOffer = null;
    this.onWebRTCAnswer = null;
    this.onICECandidate = null;
    
    // New: Callbacks for proper WebRTC timing
    this.onPrepareWebRTC = null; // For receiver to prepare
    this.onCreateOffer = null;   // For caller to create offer
    this.onCallAnsweredWithOffer = null; // For caller when call is answered
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

    // ========== NEW: PREPARE WEBRTC (for receiver/woman) ==========
    // Server tells receiver to setup WebRTC before caller sends offer
    this.socket.on('prepare_webrtc', (data) => {
      console.log('📞 PREPARE_WEBRTC (receiver should setup now):', data);
      if (this.onPrepareWebRTC) {
        this.onPrepareWebRTC(data);
      }
    });

    // ========== NEW: CREATE OFFER (for caller) ==========
    // Server tells caller that receiver is ready, create and send offer now
    this.socket.on('create_offer', (data) => {
      console.log('📞 CREATE_OFFER (caller should create offer now):', data);
      if (this.onCreateOffer) {
        this.onCreateOffer(data);
      }
    });

    // ========== CALL ANSWERED (for caller - men) ==========
    this.socket.on('call_answered', (data) => {
      console.log('📞 Call answered:', data);
      store.dispatch(callAnswered({ callId: data.callId }));
      
      // If shouldCreateOffer is true, caller needs to initialize WebRTC
      if (data.shouldCreateOffer && this.onCallAnsweredWithOffer) {
        this.onCallAnsweredWithOffer(data);
      }
    });

    // ========== CALL CONNECTED ==========
    this.socket.on('call_connected', (data) => {
      console.log('📞 Call connected:', data);
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
      console.log('📞 Call ended:', data);
      store.dispatch(
        endCall({
          reason: data.reason || 'ended',
          duration: data.duration,
          coinsUsed: data.coinsUsed,
          coinsEarned: data.coinsEarned,
        }),
      );
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
      if (this.onWebRTCOffer) {
        this.onWebRTCOffer(data);
      }
    });

    this.socket.on('webrtc_answer', (data) => {
      console.log('🎥 WebRTC ANSWER received from:', data.fromUserId);
      if (this.onWebRTCAnswer) {
        this.onWebRTCAnswer(data);
      }
    });

    this.socket.on('ice_candidate', (data) => {
      console.log('🎥 ICE candidate received');
      if (this.onICECandidate) {
        this.onICECandidate(data);
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

  rejectCall(callId) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Rejecting call:', callId);
    this.socket.emit('reject_call', { callId });
    return true;
  }

  endCall(callId) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Ending call:', callId);
    this.socket.emit('end_call', { callId });
    return true;
  }

  // ========== NEW: Signal WebRTC is ready (for receiver) ==========
  signalWebRTCReady(callId) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Signaling WebRTC ready for call:', callId);
    this.socket.emit('webrtc_ready', { callId });
    return true;
  }

  // ========== NEW: Signal call connected (audio confirmed) ==========
  signalCallConnected(callId) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Signaling call connected (audio confirmed):', callId);
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

  setWebRTCCallbacks(callbacks) {
    this.onWebRTCOffer = callbacks.onOffer || null;
    this.onWebRTCAnswer = callbacks.onAnswer || null;
    this.onICECandidate = callbacks.onICECandidate || null;
    this.onPrepareWebRTC = callbacks.onPrepareWebRTC || null;
    this.onCreateOffer = callbacks.onCreateOffer || null;
    this.onCallAnsweredWithOffer = callbacks.onCallAnsweredWithOffer || null;
  }

  // ========== AVAILABILITY ==========
  setAvailability(isAvailable) {
    if (!this.socket?.connected) return false;
    console.log('🔄 Setting availability:', isAvailable);
    this.socket.emit('set_availability', { isAvailable });
    return true;
  }

  toggleAvailability(userId, isAvailable) {
    if (!this.socket?.connected) return false;
    this.socket.emit('toggle_availability', { userId, isAvailable });
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