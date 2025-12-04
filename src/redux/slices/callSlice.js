import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeCall: null,
  callStatus: 'idle', // idle, calling, ringing, connected, ended
  duration: 0,
  callHistory: [],
  loading: false,
  error: null,
  remoteUser: null,
  iceServers: null,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    // Initiate Call
    initiateCallStart: (state, action) => {
      state.callStatus = 'calling';
      state.remoteUser = action.payload;
      state.duration = 0;
      state.error = null;
    },

    // Incoming Call
    incomingCall: (state, action) => {
      state.callStatus = 'ringing';
      state.remoteUser = action.payload;
    },

    // Call Connected
    callConnected: (state, action) => {
      state.callStatus = 'connected';
      state.activeCall = action.payload;
    },

    // Call Ended
    callEnded: (state, action) => {
      state.callStatus = 'ended';
      state.activeCall = null;
      state.remoteUser = null;
      state.duration = 0;
    },

    // Call Failed
    callFailed: (state, action) => {
      state.callStatus = 'idle';
      state.activeCall = null;
      state.remoteUser = null;
      state.error = action.payload;
    },

    // Update Duration
    updateCallDuration: (state, action) => {
      state.duration = action.payload;
    },

    // Reset Call
    resetCall: (state) => {
      state.callStatus = 'idle';
      state.activeCall = null;
      state.remoteUser = null;
      state.duration = 0;
      state.error = null;
    },

    // Get ICE Servers
    getICEServersSuccess: (state, action) => {
      state.iceServers = action.payload;
    },

    // Get Call History
    getCallHistoryStart: (state) => {
      state.loading = true;
    },
    getCallHistorySuccess: (state, action) => {
      state.loading = false;
      state.callHistory = action.payload;
    },
    getCallHistoryFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // Clear error
    clearCallError: (state) => {
      state.error = null;
    },
  },
});

export const {
  initiateCallStart,
  incomingCall,
  callConnected,
  callEnded,
  callFailed,
  updateCallDuration,
  resetCall,
  getICEServersSuccess,
  getCallHistoryStart,
  getCallHistorySuccess,
  getCallHistoryFailure,
  clearCallError,
} = callSlice.actions;

export default callSlice.reducer;

// Selectors
export const selectCallStatus = (state) => state.call.callStatus;
export const selectActiveCall = (state) => state.call.activeCall;
export const selectCallDuration = (state) => state.call.duration;
export const selectRemoteUser = (state) => state.call.remoteUser;
export const selectICEServers = (state) => state.call.iceServers;