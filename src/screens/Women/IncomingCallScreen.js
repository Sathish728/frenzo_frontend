/**
 * IncomingCallScreen for Women (Receiver) - PRODUCTION FIXED VERSION
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Animated,
  BackHandler,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';

import { COLORS, FONTS, SPACING, RADIUS, CALL_RATES } from '../../config/constants';
import {
  callAnswered,
  callConnected,
  incrementDuration,
  toggleMute,
  toggleSpeaker,
  endCall,
  resetCall,
} from '../../redux/slices/callSlice';
import { updateCoins } from '../../redux/slices/authSlice';
import socketService from '../../services/socketService';
import webRTCService from '../../services/webrtcService';
import { requestCallPermissions } from '../../utils/permissions';
import Avatar from '../../components/common/Avatar';
import { formatNumber } from '../../utils/helpers';

const IncomingCallScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { status, duration, remoteUser, callId, isMuted, isSpeakerOn } = useSelector(
    (state) => state.call,
  );

  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [audioConnected, setAudioConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('ringing');

  // Setup on mount
  useEffect(() => {
    const init = async () => {
      // Request permissions
      const permissions = await requestCallPermissions();
      if (!permissions.microphone) {
        Alert.alert(
          'Microphone Required',
          'Cannot answer calls without microphone access.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Setup WebRTC with socket
      webRTCService.setSocketService(socketService);
      
      // Set WebRTC callbacks
      webRTCService.setCallbacks({
        onRemoteStream: (stream) => {
          console.log('📞 IncomingCall: Got remote audio stream');
        },
        onConnectionStateChange: (state) => {
          console.log('📞 IncomingCall: ICE state:', state);
        },
        onCallConnected: () => {
          console.log('📞 IncomingCall: Audio CONNECTED!');
          setAudioConnected(true);
          setConnectionStatus('connected');
          Vibration.vibrate(100);
          dispatch(callConnected());
        },
        onCallEnded: (reason) => {
          console.log('📞 IncomingCall: Call ended:', reason);
          handleEndCall(reason);
        },
      });

      // Setup socket callbacks
      socketService.setCallback('onPrepareWebRTC', async (data) => {
        console.log('📞 IncomingCall: Received prepare_webrtc');
        setConnectionStatus('preparing');
        
        try {
          await webRTCService.prepareAsReceiver(data.callId, data.remoteUserId);
          setConnectionStatus('waiting_for_offer');
        } catch (error) {
          console.error('📞 IncomingCall: Failed to prepare WebRTC:', error);
          handleEndCall('webrtc_error');
        }
      });

      socketService.setCallback('onCallEnded', (data) => {
        handleEndCall(data.reason || 'call_ended');
      });

      socketService.setCallback('onCoinUpdate', (data) => {
        console.log('📞 IncomingCall: Coin update:', data);
        if (data.earned !== undefined) {
          setCoinsEarned(prev => prev + data.earned);
        }
        if (data.coins !== undefined) {
          dispatch(updateCoins(data.coins));
        }
      });
    };

    init();

    return () => {
      Vibration.cancel();
      webRTCService.cleanup();
      if (timerRef.current) clearInterval(timerRef.current);
      socketService.setCallback('onPrepareWebRTC', null);
      socketService.setCallback('onCallEnded', null);
      socketService.setCallback('onCoinUpdate', null);
    };
  }, []);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (status === 'connected' || audioConnected) {
        handleEndCall('user_ended');
        return true;
      }
      if (status === 'ringing') {
        handleDecline();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [status, audioConnected]);

  // Vibration and animation for ringing
  useEffect(() => {
    if (status === 'ringing') {
      const pattern = [0, 400, 200, 400, 200, 400];
      Vibration.vibrate(pattern, true);

      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();

      return () => {
        anim.stop();
        Vibration.cancel();
      };
    }
  }, [status]);

  // Timer for call duration
  useEffect(() => {
    if (audioConnected && !timerRef.current) {
      console.log('📞 IncomingCall: Starting duration timer');
      timerRef.current = setInterval(() => {
        dispatch(incrementDuration());
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [audioConnected]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = async () => {
    console.log('📞 IncomingCall: Answering call', callId);
    Vibration.cancel();
    
    dispatch(callAnswered());
    setConnectionStatus('answering');
    
    // Tell server we answered - server will send 'prepare_webrtc' event
    socketService.answerCall(callId);
  };

  const handleDecline = () => {
    console.log('📞 IncomingCall: Declining call', callId);
    Vibration.cancel();
    
    socketService.declineCall(callId, 'declined');
    dispatch(resetCall());
    navigation.goBack();
  };

  const handleEndCall = useCallback((reason = 'user_ended') => {
    console.log('📞 IncomingCall: Ending call, reason:', reason);
    
    Vibration.cancel();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    webRTCService.cleanup();
    
    if (reason !== 'call_ended' && reason !== 'caller_ended') {
      socketService.endCall(callId, reason);
    }
    
    dispatch(endCall({ reason }));
    
    if (duration > 0 || coinsEarned > 0) {
      Alert.alert(
        'Call Ended',
        `Duration: ${formatDuration(duration)}\nCoins Earned: ${formatNumber(coinsEarned)}`,
        [{ text: 'OK', onPress: () => {
          dispatch(resetCall());
          navigation.goBack();
        }}]
      );
    } else {
      dispatch(resetCall());
      navigation.goBack();
    }
  }, [callId, duration, coinsEarned]);

  const handleToggleMute = () => {
    webRTCService.toggleMute();
    dispatch(toggleMute());
  };

  const handleToggleSpeaker = () => {
    webRTCService.toggleSpeaker();
    dispatch(toggleSpeaker());
  };

  const getStatusText = () => {
    if (audioConnected) return 'Connected';
    switch (connectionStatus) {
      case 'ringing': return 'Incoming Call...';
      case 'answering': return 'Answering...';
      case 'preparing': return 'Preparing audio...';
      case 'waiting_for_offer': return 'Connecting...';
      case 'connected': return 'Connected';
      default: return 'Connecting...';
    }
  };

  // Ringing UI
  if (status === 'ringing') {
    return (
      <LinearGradient
        colors={[COLORS.background, '#1a1a2e', COLORS.surface]}
        style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.ringingContainer}>
            <Animated.View style={[styles.avatarContainer, { transform: [{ scale: pulseAnim }] }]}>
              <Avatar
                name={remoteUser?.name}
                imageUrl={remoteUser?.profileImage}
                size={120}
              />
            </Animated.View>
            
            <Text style={styles.callerName}>{remoteUser?.name || 'Unknown'}</Text>
            <Text style={styles.callStatus}>Incoming Voice Call</Text>
            
            <View style={styles.rateContainer}>
              <Icon name="currency-inr" size={16} color={COLORS.success} />
              <Text style={styles.rateText}>Earn {CALL_RATES.coinsPerMinute} coins/min</Text>
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={handleDecline}>
                <Icon name="phone-hangup" size={36} color={COLORS.white} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.answerButton]}
                onPress={handleAnswer}>
                <Icon name="phone" size={36} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Connected UI
  return (
    <LinearGradient
      colors={[COLORS.background, '#1a1a2e', COLORS.surface]}
      style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.connectedContainer}>
          <View style={styles.avatarContainer}>
            <Avatar
              name={remoteUser?.name}
              imageUrl={remoteUser?.profileImage}
              size={100}
            />
            {audioConnected && (
              <View style={styles.connectedIndicator}>
                <Icon name="check-circle" size={24} color={COLORS.success} />
              </View>
            )}
          </View>
          
          <Text style={styles.callerName}>{remoteUser?.name || 'Unknown'}</Text>
          
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusDot,
              { backgroundColor: audioConnected ? COLORS.success : COLORS.warning }
            ]} />
            <Text style={styles.callStatus}>{getStatusText()}</Text>
          </View>
          
          <Text style={styles.duration}>{formatDuration(duration)}</Text>
          
          <View style={styles.earningsContainer}>
            <Icon name="currency-inr" size={20} color={COLORS.success} />
            <Text style={styles.earningsText}>{formatNumber(coinsEarned)}</Text>
            <Text style={styles.earningsLabel}>earned</Text>
          </View>

          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={handleToggleMute}>
              <Icon 
                name={isMuted ? 'microphone-off' : 'microphone'} 
                size={28} 
                color={COLORS.white} 
              />
              <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
              onPress={handleToggleSpeaker}>
              <Icon 
                name={isSpeakerOn ? 'volume-high' : 'volume-medium'} 
                size={28} 
                color={COLORS.white} 
              />
              <Text style={styles.controlLabel}>Speaker</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.endCallButton}
            onPress={() => handleEndCall('user_ended')}>
            <Icon name="phone-hangup" size={32} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  ringingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  connectedContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
  },
  avatarContainer: {
    marginBottom: SPACING.lg,
    position: 'relative',
  },
  connectedIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 2,
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  callStatus: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xxl,
  },
  rateText: {
    fontSize: 16,
    color: COLORS.success,
    marginLeft: SPACING.xs,
  },
  duration: {
    fontSize: 48,
    fontWeight: '300',
    color: COLORS.text,
    marginVertical: SPACING.lg,
  },
  earningsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xl,
  },
  earningsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.success,
    marginLeft: SPACING.xs,
  },
  earningsLabel: {
    fontSize: 14,
    color: COLORS.success,
    marginLeft: SPACING.xs,
    opacity: 0.8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: SPACING.xxl,
  },
  actionButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 30,
    elevation: 5,
  },
  answerButton: {
    backgroundColor: COLORS.success,
  },
  declineButton: {
    backgroundColor: COLORS.danger,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: SPACING.xl,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  controlLabel: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: SPACING.xs,
    opacity: 0.8,
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.danger,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    elevation: 5,
  },
});

export default IncomingCallScreen;
