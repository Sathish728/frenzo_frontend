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
  endReason: null,
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
      state.status = 'ringing';
      state.remoteUser = action.payload.caller;
      state.callId = action.payload.callId;
      state.duration = 0;
      state.coinsEarned = 0;
    },
    // Call answered
    callAnswered: (state, action) => {
      state.status = 'connecting';
      if (action.payload?.callId) {
        state.callId = action.payload.callId;
      }
    },
    // Call connected
    callConnected: (state) => {
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
      state.status = 'ended';
      state.endReason = action.payload?.reason || 'ended';
      if (action.payload?.duration) {
        state.duration = action.payload.duration;
      }
      if (action.payload?.coinsUsed) {
        state.coinsUsed = action.payload.coinsUsed;
      }
      if (action.payload?.coinsEarned) {
        state.coinsEarned = action.payload.coinsEarned;
      }
    },
    // Call failed/rejected
    callFailed: (state, action) => {
      state.status = 'ended';
      state.endReason = action.payload?.reason || 'failed';
      state.error = action.payload?.error || null;
    },
    // Reset call state
    resetCall: () => initialState,
    // Set error
    setCallError: (state, action) => {
      state.error = action.payload;
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
} = callSlice.actions;

export default callSlice.reducer;
