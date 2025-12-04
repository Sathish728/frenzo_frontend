import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useAppDispatch';
import { selectICEServers } from '../redux/slices/callSlice';
import { fetchICEServers } from '../redux/thunks/callThunks';
import webRTCService from '../services/webrtc.service';
import socketService from '../services/socket.service';

const useWebRTC = () => {
  const dispatch = useAppDispatch();
  const iceServers = useAppSelector(selectICEServers);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!iceServers && !isInitialized.current) {
      dispatch(fetchICEServers());
      isInitialized.current = true;
    }
  }, [dispatch, iceServers]);

  useEffect(() => {
    if (iceServers) {
      webRTCService.initialize(iceServers);
    }
  }, [iceServers]);

  const startCall = useCallback(
    async (menUserId, womenUserId, onRemoteStream) => {
      try {
        await webRTCService.startCall(menUserId, womenUserId, onRemoteStream);
      } catch (error) {
        console.error('Start call error:', error);
        throw error;
      }
    },
    []
  );

  const answerCall = useCallback(async (menUserId, offer, onRemoteStream) => {
    try {
      const answer = await webRTCService.answerCall(menUserId, offer, onRemoteStream);
      
      // Get womenUserId from Redux state
      const state = store.getState();
      const womenUserId = state.auth.user.id;
      
      socketService.emit('call_accepted', {
        menUserId,
        womenUserId,
        answer,
      });
    } catch (error) {
      console.error('Answer call error:', error);
      throw error;
    }
  }, []);

  const endCall = useCallback((callId) => {
    webRTCService.endCall(callId);
  }, []);

  useEffect(() => {
    // Setup ICE candidate listener
    const handleIceCandidate = ({ candidate }) => {
      webRTCService.handleIceCandidate(candidate);
    };

    socketService.socket?.on('ice_candidate', handleIceCandidate);

    return () => {
      socketService.socket?.off('ice_candidate', handleIceCandidate);
    };
  }, []);

  return {
    startCall,
    answerCall,
    endCall,
    isReady: !!iceServers,
  };
};

export default useWebRTC;
