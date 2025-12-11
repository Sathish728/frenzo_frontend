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
  }

  // Connect to socket server
  connect(token) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: {token},
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupListeners();
  }

  // Setup event listeners
  setupListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket.id);
      this.isConnected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    // Women list updates
    this.socket.on('women_list_updated', (data) => {
      store.dispatch(setAvailableWomen(data.women));
    });

    // Woman status changed
    this.socket.on('woman_status_changed', (data) => {
      store.dispatch(updateWomanStatus(data));
    });

    // Coins updated
    this.socket.on('coins_updated', (data) => {
      store.dispatch(updateCoins(data.coins));
    });

    // Incoming call (for women)
    this.socket.on('incoming_call', (data) => {
      store.dispatch(
        receiveCall({
          caller: data.caller,
          callId: data.callId,
        }),
      );
    });

    // Call answered
    this.socket.on('call_answered', (data) => {
      store.dispatch(callAnswered({callId: data.callId}));
    });

    // Call connected
    this.socket.on('call_connected', () => {
      store.dispatch(callConnected());
    });

    // Call duration update
    this.socket.on('call_duration_update', (data) => {
      store.dispatch(
        updateDuration({
          duration: data.duration,
          coinsUsed: data.coinsUsed,
          coinsEarned: data.coinsEarned,
        }),
      );
    });

    // Call ended
    this.socket.on('call_ended', (data) => {
      store.dispatch(
        endCall({
          reason: data.reason,
          duration: data.duration,
          coinsUsed: data.coinsUsed,
          coinsEarned: data.coinsEarned,
        }),
      );
    });

    // Call rejected
    this.socket.on('call_rejected', (data) => {
      store.dispatch(
        callFailed({
          reason: 'rejected',
          error: data.message || 'Call was rejected',
        }),
      );
    });

    // Call failed
    this.socket.on('call_failed', (data) => {
      store.dispatch(
        callFailed({
          reason: 'failed',
          error: data.message || 'Call failed',
        }),
      );
    });

    // User busy
    this.socket.on('user_busy', () => {
      store.dispatch(
        callFailed({
          reason: 'busy',
          error: 'User is busy on another call',
        }),
      );
    });

    // Insufficient coins
    this.socket.on('insufficient_coins', () => {
      store.dispatch(
        callFailed({
          reason: 'insufficient_coins',
          error: 'Not enough coins to make this call',
        }),
      );
    });
  }

  // Emit events
  initiateCall(womanId) {
    if (!this.socket?.connected) return false;
    this.socket.emit('initiate_call', {womanId});
    return true;
  }

  answerCall(callId) {
    if (!this.socket?.connected) return false;
    this.socket.emit('answer_call', {callId});
    return true;
  }

  rejectCall(callId) {
    if (!this.socket?.connected) return false;
    this.socket.emit('reject_call', {callId});
    return true;
  }

  endCall(callId) {
    if (!this.socket?.connected) return false;
    this.socket.emit('end_call', {callId});
    return true;
  }

  setAvailability(isAvailable) {
    if (!this.socket?.connected) return false;
    this.socket.emit('set_availability', {isAvailable});
    return true;
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export const socketService = new SocketService();
export default socketService;
