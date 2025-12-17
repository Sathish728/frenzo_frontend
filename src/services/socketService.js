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

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.heartbeatInterval = null;
  }

  // Connect to socket server
  connect(token) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    console.log('Connecting to socket:', SOCKET_URL);

    this.socket = io(SOCKET_URL, {
      auth: {token},
      transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      // These help with Render free tier
      forceNew: false,
      multiplex: true,
    });

    this.setupListeners();
  }

  // Setup event listeners
  setupListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Register user online
      const state = store.getState();
      const userId = state.auth.user?.id || state.auth.user?._id;
      if (userId) {
        this.socket.emit('user_online', userId);
        console.log('Emitted user_online for:', userId);
      }

      // Start heartbeat to keep connection alive (important for Render free tier)
      this.startHeartbeat();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      this.isConnected = false;
      this.stopHeartbeat();
      
      // If server disconnected us, try to reconnect
      if (reason === 'io server disconnect') {
        console.log('Server disconnected, attempting reconnect...');
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      
      // Re-register user online after reconnect
      const state = store.getState();
      const userId = state.auth.user?.id || state.auth.user?._id;
      if (userId) {
        this.socket.emit('user_online', userId);
      }
    });

    // Heartbeat response
    this.socket.on('pong', () => {
      // Connection is alive
    });

    // ========== WOMEN LIST UPDATES ==========
    this.socket.on('women_list_updated', (data) => {
      console.log('Women list updated:', data);
      const women = Array.isArray(data) ? data : (data.women || []);
      store.dispatch(setAvailableWomen(women));
    });

    // Woman status changed
    this.socket.on('woman_status_changed', (data) => {
      console.log('Woman status changed:', data);
      store.dispatch(updateWomanStatus(data));
    });

    // ========== COINS ==========
    this.socket.on('coins_updated', (data) => {
      console.log('Coins updated:', data);
      store.dispatch(updateCoins(data.coins));
    });

    // ========== INCOMING CALL (for women) ==========
    this.socket.on('incoming_call', (data) => {
      console.log('📞 INCOMING CALL:', JSON.stringify(data));
      
      // Build caller object from various possible structures
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

    // ========== CALL ANSWERED (for men - call was accepted) ==========
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
      console.log('Call duration update:', data);
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
      // Could show a notification here
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
  }

  // ========== HEARTBEAT (keeps Render free tier alive) ==========
  startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing
    
    // Send ping every 25 seconds (Render times out after ~30s of inactivity)
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, 25000);
    
    console.log('Heartbeat started');
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('Heartbeat stopped');
    }
  }

  // ========== EMIT METHODS ==========

  // Initiate call to woman (for men)
  initiateCall(womanId) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Initiating call to:', womanId);
    this.socket.emit('initiate_call', {womanId});
    return true;
  }

  // Answer incoming call (for women)
  answerCall(callId) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Answering call:', callId);
    this.socket.emit('answer_call', {callId});
    return true;
  }

  // Reject incoming call (for women)
  rejectCall(callId) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Rejecting call:', callId);
    this.socket.emit('reject_call', {callId});
    return true;
  }

  // End ongoing call
  endCall(callId) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('📞 Ending call:', callId);
    this.socket.emit('end_call', {callId});
    return true;
  }

  // Set availability (for women)
  setAvailability(isAvailable) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('🔄 Setting availability:', isAvailable);
    this.socket.emit('set_availability', {isAvailable});
    return true;
  }

  // Toggle availability (for women)
  toggleAvailability(userId, isAvailable) {
    if (!this.socket?.connected) {
      console.error('Socket not connected');
      return false;
    }
    console.log('🔄 Toggle availability:', userId, isAvailable);
    this.socket.emit('toggle_availability', {userId, isAvailable});
    return true;
  }

  // Check if connected
  isSocketConnected() {
    return this.socket?.connected || false;
  }

  // Get socket ID
  getSocketId() {
    return this.socket?.id || null;
  }

  // Disconnect
  disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      console.log('Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Reconnect
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
