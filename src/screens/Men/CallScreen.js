import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import {
  initiateCallStart,
  callEnded,
  resetCall,
  selectCallStatus,
  selectActiveCall,
} from '../../redux/slices/callSlice';
import useWebRTC from '../../hooks/useWebRTC';
import socketService from '../../services/socket.service';
import CallTimer from '../../components/CallTimer';
import { theme } from '../../config/theme';

const CallScreen = ({ route, navigation }) => {
  const { womenUserId, womenName } = route.params;
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const callStatus = useAppSelector(selectCallStatus);
  const activeCall = useAppSelector(selectActiveCall);
  const { startCall, endCall, isReady } = useWebRTC();
  const [callId, setCallId] = useState(null);

  useEffect(() => {
    if (isReady) {
      initiateCall();
    }

    setupSocketListeners();

    return () => {
      cleanup();
    };
  }, [isReady]);

  const initiateCall = async () => {
    try {
      dispatch(initiateCallStart({ _id: womenUserId, name: womenName }));
      
      await startCall(user.id, womenUserId, (remoteStream) => {
        console.log('Remote stream received');
      });
    } catch (error) {
      console.error('Call initiation error:', error);
      Alert.alert('Error', 'Failed to start call', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const setupSocketListeners = () => {
    socketService.socket?.on('call_answered', ({ callId, answer }) => {
      setCallId(callId);
    });

    socketService.socket?.on('call_ended', ({ reason }) => {
      if (reason === 'insufficient_coins') {
        Alert.alert(
          'Call Ended',
          'Insufficient coins. Please buy more coins.',
          [
            { text: 'Buy Coins', onPress: () => navigation.replace('BuyCoins') },
            { text: 'OK', onPress: () => navigation.goBack() },
          ]
        );
      } else {
        navigation.goBack();
      }
    });

    socketService.socket?.on('call_failed', ({ message }) => {
      Alert.alert('Call Failed', message, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    });
  };

  const handleEndCall = () => {
    if (callId) {
      endCall(callId);
    }
    cleanup();
    navigation.goBack();
  };

  const cleanup = () => {
    dispatch(resetCall());
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'calling':
        return 'Calling...';
      case 'connected':
        return 'Connected';
      default:
        return 'Connecting...';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.name}>{womenName}</Text>
        <Text style={styles.status}>{getStatusText()}</Text>

        {callStatus === 'connected' && (
          <>
            <CallTimer />
            <Text style={styles.info}>40 coins per minute</Text>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.endButton} onPress={handleEndCall}>
        <Text style={styles.endButtonText}>End Call</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'space-between',
    padding: theme.spacing.xxl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
  },
  status: {
    fontSize: theme.fonts.sizes.lg,
    color: '#bbb',
    marginBottom: theme.spacing.xxl,
  },
  info: {
    fontSize: theme.fonts.sizes.md,
    color: '#bbb',
    marginTop: theme.spacing.md,
  },
  endButton: {
    backgroundColor: theme.colors.danger,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.round,
    alignItems: 'center',
  },
  endButtonText: {
    color: theme.colors.white,
    fontSize: theme.fonts.sizes.xl,
    fontWeight: 'bold',
  },
});

export default CallScreen;