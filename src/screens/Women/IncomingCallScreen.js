import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { selectCurrentUser } from '../../redux/slices/authSlice';
import { incomingCall, resetCall } from '../../redux/slices/callSlice';
import useWebRTC from '../../hooks/useWebRTC';
import socketService from '../../services/socket.service';
import CallTimer from '../../components/CallTimer';
import { theme } from '../../config/theme';

const IncomingCallScreen = ({ route, navigation }) => {
  const { menUserId, menName, offer } = route.params;
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const { answerCall, endCall, isReady } = useWebRTC();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callId, setCallId] = useState(null);

  useEffect(() => {
    dispatch(incomingCall({ _id: menUserId, name: menName }));
    
    setupSocketListeners();

    return () => {
      cleanup();
    };
  }, []);

  const setupSocketListeners = () => {
    socketService.socket?.on('call_ended', () => {
      cleanup();
      navigation.goBack();
    });
  };

  const handleAccept = async () => {
    if (!isReady) return;

    try {
      await answerCall(menUserId, offer, (remoteStream) => {
        console.log('Remote stream received');
      });
      
      setCallAccepted(true);
    } catch (error) {
      console.error('Answer call error:', error);
      navigation.goBack();
    }
  };

  const handleReject = () => {
    cleanup();
    navigation.goBack();
  };

  const cleanup = () => {
    dispatch(resetCall());
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.name}>{menName}</Text>
        <Text style={styles.status}>
          {callAccepted ? 'Connected' : 'Incoming Call...'}
        </Text>

        {callAccepted && (
          <>
            <CallTimer />
            <Text style={styles.info}>Earning 40 coins per minute</Text>
          </>
        )}
      </View>

      {!callAccepted ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={handleReject}
          >
            <Text style={styles.buttonText}>✕ Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptButton}
            onPress={handleAccept}
          >
            <Text style={styles.buttonText}>✓ Accept</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.endButton} onPress={handleReject}>
          <Text style={styles.buttonText}>End Call</Text>
        </TouchableOpacity>
      )}
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
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: theme.colors.danger,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.round,
    alignItems: 'center',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.round,
    alignItems: 'center',
  },
  endButton: {
    backgroundColor: theme.colors.danger,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.round,
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: theme.fonts.sizes.xl,
    fontWeight: 'bold',
  },
});

export default IncomingCallScreen;