import {createSlice} from '@reduxjs/toolkit';

const initialState = {
  status: 'idle', // idle, calling, ringing, connecting, connected, ended
  callId: null,
  remoteUser: null,
  duration: 0,
  coinsUsed: 0,
  coinsEarned: 0,
  isMuted: false,
  isSpeakerOn: false,
  endReason: null, // user_ended, remote_ended, busy, rejected, no_answer, failed, insufficient_coins, disconnected
  error: null,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    // Initiate call (for men)
    initiateCall: (state, action) => {
      state.status = 'calling';
      state.remoteUser = action.payload.user;
      state.callId = action.payload.callId || null;
      state.duration = 0;
      state.coinsUsed = 0;
      state.coinsEarned = 0;
      state.isMuted = false;
      state.isSpeakerOn = false;
      state.endReason = null;
      state.error = null;
    },
    
    // Receive incoming call (for women)
    receiveCall: (state, action) => {
      console.log('📞 Redux: receiveCall', action.payload);
      state.status = 'ringing';
      state.remoteUser = action.payload.caller;
      state.callId = action.payload.callId;
      state.duration = 0;
      state.coinsEarned = 0;
      state.endReason = null;
      state.error = null;
    },
    
    // Call answered (transition state)
    callAnswered: (state, action) => {
      console.log('📞 Redux: callAnswered', action.payload);
      state.status = 'connecting';
      if (action.payload?.callId) {
        state.callId = action.payload.callId;
      }
    },
    
    // Call connected (both parties in call)
    callConnected: (state) => {
      console.log('📞 Redux: callConnected');
      state.status = 'connected';
    },
    
    // Update call duration
    updateDuration: (state, action) => {
      state.duration = action.payload.duration;
      if (action.payload.coinsUsed !== undefined) {
        state.coinsUsed = action.payload.coinsUsed;
      }
      if (action.payload.coinsEarned !== undefined) {
        state.coinsEarned = action.payload.coinsEarned;
      }
    },
    
    // Increment duration by 1 second
    incrementDuration: (state) => {
      state.duration += 1;
    },
    
    // Toggle mute
    toggleMute: (state) => {
      state.isMuted = !state.isMuted;
    },
    
    // Toggle speaker
    toggleSpeaker: (state) => {
      state.isSpeakerOn = !state.isSpeakerOn;
    },
    
    // End call
    endCall: (state, action) => {
      console.log('📞 Redux: endCall', action.payload);
      state.status = 'ended';
      state.endReason = action.payload?.reason || 'ended';
      if (action.payload?.duration !== undefined) {
        state.duration = action.payload.duration;
      }
      if (action.payload?.coinsUsed !== undefined) {
        state.coinsUsed = action.payload.coinsUsed;
      }
      if (action.payload?.coinsEarned !== undefined) {
        state.coinsEarned = action.payload.coinsEarned;
      }
    },
    
    // Call failed/rejected
    callFailed: (state, action) => {
      console.log('📞 Redux: callFailed', action.payload);
      state.status = 'ended';
      state.endReason = action.payload?.reason || 'failed';
      state.error = action.payload?.error || null;
    },
    
    // Reset call state
    resetCall: () => {
      console.log('📞 Redux: resetCall');
      return initialState;
    },
    
    // Set error
    setCallError: (state, action) => {
      state.error = action.payload;
    },
    
    // Update remote user info
    updateRemoteUser: (state, action) => {
      state.remoteUser = {...state.remoteUser, ...action.payload};
    },
  },
});

export const {
  initiateCall,
  receiveCall,
  callAnswered,
  callConnected,
  updateDuration,
  incrementDuration,
  toggleMute,
  toggleSpeaker,
  endCall,
  callFailed,
  resetCall,
  setCallError,
  updateRemoteUser,
} = callSlice.actions;

export default callSlice.reducer;