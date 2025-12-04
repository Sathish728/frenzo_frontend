import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  connected: false,
  socketId: null,
  error: null,
};

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    socketConnected: (state, action) => {
      state.connected = true;
      state.socketId = action.payload;
      state.error = null;
    },
    socketDisconnected: (state) => {
      state.connected = false;
      state.socketId = null;
    },
    socketError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { socketConnected, socketDisconnected, socketError } = socketSlice.actions;

export default socketSlice.reducer;

// Selectors
export const selectSocketConnected = (state) => state.socket.connected;
export const selectSocketId = (state) => state.socket.socketId;