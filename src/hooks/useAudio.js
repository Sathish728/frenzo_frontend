import { useEffect, useCallback } from 'react';
import { useAppSelector } from './useAppDispatch';
import { selectCurrentUser } from '../redux/slices/authSlice';
import audioService from '../services/audio.service';
import socketService from '../services/socket.service';

const useAudio = () => {
  const user = useAppSelector(selectCurrentUser);

  useEffect(() => {
    audioService.initialize();

    // Listen for incoming audio chunks
    socketService.socket?.on('audio_chunk', ({ audioData }) => {
      audioService.playAudioChunk(audioData);
    });

    return () => {
      audioService.cleanup();
      socketService.socket?.off('audio_chunk');
    };
  }, []);

  const startCall = useCallback(
    async (callId, targetUserId) => {
      try {
        await audioService.startRecording(callId, targetUserId);
      } catch (error) {
        console.error('Start call error:', error);
        throw error;
      }
    },
    []
  );

  const endCall = useCallback(async () => {
    await audioService.stopRecording();
  }, []);

  return {
    startCall,
    endCall,
    isReady: true,
  };
};

export default useAudio;