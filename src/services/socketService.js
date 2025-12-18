import {io} from 'socket.io-client';
import {SOCKET_URL} from '../config/constants';
import {store} from '../redux/store';
import {setAvailableWomen, updateWomanStatus} from '../redux/slices/userSlice';
import {updateCoins} from '../redux/slices/authSlice';
import {
  receiveCall,
  callAnswered,
  callConnected,
  endCall,
  callFailed,
  updateDuration,
} from '../redux/slices/callSlice';

/**
 * Socket Service for Real-Time Communication
 * 
 * Handles:
 * - User presence (online/offline status)
 * - Call signaling (initiate, answer, reject, end)
 * - WebRTC signaling (offer, answer, ICE candidates)
 * - Real-time updates (coin balance, user status)
 */
class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.heartbeatInterval = null;
    
    // WebRTC callbacks
    this.onWebRTCOffer = null;
    this.onWebRTCAnswer = null;
    this.onICECandidate = null;
  }

  /**
   * Connect to socket server
   */
  connect(token) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    console.log('🔌 Connecting to socket:', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      auth: {token},
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      forceNew: false,
      multiplex: true,
    });

    this.setupListeners();
  }

  /**
   * Setup event listeners
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
        console.log('🔄 Server disconnected, reconnecting...');
        this.socket.connect();
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

    // Heartbeat response
    this.socket.on('pong', () => {
      // Connection alive
    });

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

    // ========== CALL ANSWERED (for caller) ==========
    this.socket.on('call_answered', (data) => {
      console.log('📞 Call answered:', data);
      store.dispatch(callAnswered({callId: data.callId}));
    });

    // ========== CALL CONNECTED ==========
    this.socket.on('call_connected', (data) => {
      console.log('📞 Call connected:', data);
      store.dispatch(callConnected());
    });

    // ========== CALL DURATION UPDATE ==========
    this.socket.on('call_duration_update', (data) => {
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

    // ========== CALL MISSED ==========
    this.socket.on('call_missed', (data) => {
      console.log('📞 Call missed:', data);
    });

    // ========== CALL REJECTED ==========
    this.socket.on('call_rejected', (data) => {
      console.log('📞 Call rejected:', data);
      store.dispatch(
        callFailed({
          reason: 'rejected',
          error: data.message || 'Call was declined',
        }),
      );
    });

    // ========== CALL FAILED ==========
    this.socket.on('call_failed', (data) => {
      console.log('📞 Call failed:', data);
      store.dispatch(
        callFailed({
          reason: data.reason || 'failed',
          error: data.message || 'Call failed',
        }),
      );
    });

    // ========== USER BUSY ==========
    this.socket.on('user_busy', (data) => {
      console.log('📞 User busy:', data);
      store.dispatch(
        callFailed({
          reason: 'busy',
          error: data.message || 'User is busy on another call',
        }),
      );
    });

    // ========== INSUFFICIENT COINS ==========
    this.socket.on('insufficient_coins', (data) => {
      console.log('💰 Insufficient coins:', data);
      store.dispatch(
        callFailed({
          reason: 'insufficient_coins',
          error: data.message || 'Not enough coins to make this call',
        }),
      );
    });

    // ========== NO ANSWER ==========
    this.socket.on('no_answer', (data) => {
      console.log('📞 No answer:', data);
      store.dispatch(
        callFailed({
          reason: 'no_answer',
          error: 'No answer',
        }),
      );
    });

    // ========== WEBRTC SIGNALING ==========
    this.socket.on('webrtc_offer', (data) => {
      console.log('🎥 WebRTC offer received');
      if (this.onWebRTCOffer) {
        this.onWebRTCOffer(data);
      }
    });

    this.socket.on('webrtc_answer', (data) => {
      console.log('🎥 WebRTC answer received');
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
    
    console.log('💓 Heartbeat started');
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ========== CALL METHODS ==========

  /**
   * Initiate call to woman (for men)
   */
  initiateCall(womanId) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Initiating call to:', womanId);
    this.socket.emit('initiate_call', {womanId});
    return true;
  }

  /**
   * Answer incoming call (for women)
   */
  answerCall(callId) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Answering call:', callId);
    this.socket.emit('answer_call', {callId});
    return true;
  }

  /**
   * Reject incoming call (for women)
   */
  rejectCall(callId) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Rejecting call:', callId);
    this.socket.emit('reject_call', {callId});
    return true;
  }

  /**
   * End ongoing call
   */
  endCall(callId) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Ending call:', callId);
    this.socket.emit('end_call', {callId});
    return true;
  }

  // ========== WEBRTC SIGNALING METHODS ==========

  /**
   * Send WebRTC offer
   */
  sendWebRTCOffer(targetUserId, offer) {
    if (!this.socket?.connected) return false;
    console.log('🎥 Sending WebRTC offer');
    this.socket.emit('webrtc_offer', {targetUserId, offer});
    return true;
  }

  /**
   * Send WebRTC answer
   */
  sendWebRTCAnswer(targetUserId, answer) {
    if (!this.socket?.connected) return false;
    console.log('🎥 Sending WebRTC answer');
    this.socket.emit('webrtc_answer', {targetUserId, answer});
    return true;
  }

  /**
   * Send ICE candidate
   */
  sendICECandidate(targetUserId, candidate) {
    if (!this.socket?.connected) return false;
    this.socket.emit('ice_candidate', {targetUserId, candidate});
    return true;
  }

  /**
   * Set WebRTC callbacks
   */
  setWebRTCCallbacks(callbacks) {
    this.onWebRTCOffer = callbacks.onOffer || null;
    this.onWebRTCAnswer = callbacks.onAnswer || null;
    this.onICECandidate = callbacks.onICECandidate || null;
  }

  // ========== AVAILABILITY METHODS ==========

  /**
   * Set availability (for women)
   */
  setAvailability(isAvailable) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('🔄 Setting availability:', isAvailable);
    this.socket.emit('set_availability', {isAvailable});
    return true;
  }

  /**
   * Toggle availability (for women)
   */
  toggleAvailability(userId, isAvailable) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('🔄 Toggle availability:', userId, isAvailable);
    this.socket.emit('toggle_availability', {userId, isAvailable});
    return true;
  }

  // ========== UTILITY METHODS ==========

  /**
   * Check if connected
   */
  isSocketConnected() {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  getSocketId() {
    return this.socket?.id || null;
  }

  /**
   * Disconnect
   */
  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Reconnect
   */
  reconnect() {
    this.disconnect();
    const state = store.getState();
    const token = state.auth.token;
    if (token) {
      setTimeout(() => {
        this.connect(token);
      }, 1000);
    }
  }
}

export const socketService = new SocketService();
export default socketService;