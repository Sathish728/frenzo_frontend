import io from 'socket.io-client';
import { SOCKET_URL } from '../config/constants';
import { store } from '../redux/store';
import { socketConnected, socketDisconnected, socketError } from '../redux/slices/socketSlice';
import { updateWomenList, updateCoins } from '../redux/slices/userSlice';
import { incomingCall, callConnected, callEnded } from '../redux/slices/callSlice';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(userId) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      store.dispatch(socketConnected(this.socket.id));
      this.socket.emit('user_online', userId);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      store.dispatch(socketDisconnected());
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      store.dispatch(socketError(error.message));
    });

    // Real-time events
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Women list updated
    this.socket.on('women_list_updated', (women) => {
      store.dispatch(updateWomenList(women));
    });

    // Coins updated
    this.socket.on('coins_updated', (data) => {
      store.dispatch(updateCoins(data.coins));
    });

    // Incoming call (for women)
    this.socket.on('incoming_call', (data) => {
      store.dispatch(incomingCall(data));
    });

    // Call answered (for men)
    this.socket.on('call_answered', (data) => {
      store.dispatch(callConnected(data));
    });

    // Call ended
    this.socket.on('call_ended', (data) => {
      store.dispatch(callEnded(data));
    });

    // Call failed
    this.socket.on('call_failed', (data) => {
      console.log('Call failed:', data.message);
    });
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket not connected');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new SocketService();