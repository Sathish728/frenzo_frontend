// src/redux/store.js
import {configureStore, combineReducers} from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import callReducer from './slices/callSlice';
import paymentReducer from './slices/paymentSlice';
import {setAuthToken, clearAuthToken} from '../services/api/axiosConfig';

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  call: callReducer,
  payment: paymentReducer,
});

const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['auth'],
  blacklist: ['call'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Subscribe to store changes to sync auth token with axios
let currentToken = null;
store.subscribe(() => {
  const state = store.getState();
  const newToken = state.auth?.token;
  
  if (newToken !== currentToken) {
    currentToken = newToken;
    if (newToken) {
      setAuthToken(newToken);
    } else {
      clearAuthToken();
    }
  }
});

export const persistor = persistStore(store);