/**
 * CallScreen for Men (Caller) - SIMPLIFIED VERSION
 * 
 * Flow:
 * 1. Call is initiated from MenHomeScreen
 * 2. This screen shows "Ringing..."
 * 3. When woman answers, we get 'call_answered' event
 * 4. THEN we start WebRTC and create offer
 * 5. Send offer, receive answer, exchange ICE candidates
 * 6. Audio connects!
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  BackHandler,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';

import { COLORS, FONTS, SPACING, RADIUS, CALL_RATES } from '../../config/constants';
import {
  callConnected,
  incrementDuration,
  toggleMute,
  toggleSpeaker,
  endCall,
  resetCall,
} from '../../redux/slices/callSlice';
import socketService from '../../services/socketService';
import webRTCService from '../../services/webrtcService';
import { requestCallPermissions } from '../../utils/permissions';
import Avatar from '../../components/common/Avatar';
import CoinDisplay from '../../components/CoinDisplay';

const CallScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { woman } = route.params || {};
  const { user } = useSelector((state) => state.auth);
  const { status, duration, isMuted, isSpeakerOn, remoteUser, callId, endReason, error } = useSelector((state) => state.call);

  const timerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const webrtcStartedRef = useRef(false);

  const [audioConnected, setAudioConnected] = useState(false);

  // Initialize on mount
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // Request permissions
      const permissions = await requestCallPermissions();
      if (!permissions.microphone) {
        Alert.alert(
          'Microphone Required',
          'Cannot make voice calls without microphone access.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Set WebRTC callbacks
      webRTCService.setSocketService(socketService);
      webRTCService.setCallbacks({
        onAudioConnected: () => {
          if (mounted) {
            console.log('✅ CallScreen: Audio connected!');
            setAudioConnected(true);
            Vibration.vibrate(100);
            dispatch(callConnected());
          }
        },
        onCallFailed: (reason) => {
          if (mounted) {
            console.log('❌ CallScreen: Call failed:', reason);
            handleEndCall(reason);
          }
        },
        onRemoteStream: (stream) => {
          console.log('📞 CallScreen: Got remote stream');
        },
      });

      // Set socket WebRTC callbacks
      socketService.setWebRTCCallbacks({
        onOffer: null, // Caller doesn't receive offers
        onAnswer: async (data) => {
          console.log('📞 CallScreen: Received WebRTC answer');
          await webRTCService.handleAnswer(data.offer || data.answer || data, data.fromUserId);
        },
        onIceCandidate: async (data) => {
          await webRTCService.handleIceCandidate(data.candidate, data.fromUserId);
        },
      });
    };

    init();

    return () => {
      mounted = false;
      webRTCService.cleanup();
      socketService.clearWebRTCCallbacks();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // KEY: When call is answered, START WebRTC and create offer
  useEffect(() => {
    const startWebRTC = async () => {
      if (status === 'connecting' && !webrtcStartedRef.current) {
        webrtcStartedRef.current = true;
        console.log('📞 CallScreen: Call answered! Starting WebRTC...');
        
        const targetId = woman?._id || remoteUser?._id;
        if (targetId) {
          // Start call creates the offer and sends it
          const success = await webRTCService.startCall(targetId, callId);
          if (!success) {
            console.error('📞 CallScreen: Failed to start WebRTC');
            handleEndCall('webrtc_error');
          }
        }
      }
    };

    startWebRTC();
  }, [status, woman, remoteUser, callId]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (audioConnected) {
        Alert.alert(
          'End Call?',
          'Are you sure you want to end this call?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'End Call', onPress: () => handleEndCall('user_ended'), style: 'destructive' },
          ]
        );
        return true;
      }
      if (status === 'calling' || status === 'connecting') {
        handleEndCall('cancelled');
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [status, audioConnected]);

  // Pulse animation for ringing
  useEffect(() => {
    if (status === 'calling' || (status === 'connecting' && !audioConnected)) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, audioConnected]);

  // Call timeout (30 seconds)
  useEffect(() => {
    if (status === 'calling') {
      const timeout = setTimeout(() => {
        console.log('📞 CallScreen: Call timeout - no answer');
        handleEndCall('no_answer');
      }, 30000);
      return () => clearTimeout(timeout);
    }
  }, [status]);

  // Timer for connected call
  useEffect(() => {
    if (audioConnected) {
      console.log('📞 CallScreen: Starting call timer');
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

  // Handle call ended status
  useEffect(() => {
    if (status === 'ended') {
      if (timerRef.current) clearInterval(timerRef.current);
      webRTCService.cleanup();

      const shouldAlert = ['insufficient_coins', 'busy', 'rejected', 'no_answer', 'failed', 'connection_failed'].includes(endReason);
      
      if (shouldAlert) {
        let title = 'Call Ended';
        let message = 'The call has ended.';
        
        switch (endReason) {
          case 'insufficient_coins':
            title = 'Low Balance';
            message = 'Your coin balance is too low.';
            break;
          case 'busy':
            title = 'User Busy';
            message = 'This user is on another call.';
            break;
          case 'rejected':
            title = 'Call Declined';
            message = 'The user declined your call.';
            break;
          case 'no_answer':
            title = 'No Answer';
            message = 'The user did not answer.';
            break;
          default:
            message = error || 'Unable to connect.';
        }

        Alert.alert(title, message, [
          { text: 'OK', onPress: () => { dispatch(resetCall()); navigation.goBack(); } },
        ]);
      } else {
        setTimeout(() => {
          dispatch(resetCall());
          navigation.goBack();
        }, 2000);
      }
    }
  }, [status, endReason]);

  const handleEndCall = useCallback((reason = 'user_ended') => {
    console.log('📞 CallScreen: Ending call:', reason);
    
    if (timerRef.current) clearInterval(timerRef.current);
    webRTCService.cleanup();
    socketService.endCall(callId);
    dispatch(endCall({ reason, duration }));
  }, [callId, duration]);

  const handleToggleMute = useCallback(() => {
    webRTCService.toggleMute();
    dispatch(toggleMute());
  }, []);

  const handleToggleSpeaker = useCallback(() => {
    webRTCService.toggleSpeaker();
    dispatch(toggleSpeaker());
  }, []);

  const callUser = woman || remoteUser;
  const remainingCoins = user?.coins || 0;

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (status) {
      case 'calling': return 'Ringing...';
      case 'connecting': return audioConnected ? 'Connected' : 'Connecting...';
      case 'connected': return 'Connected';
      case 'ended': return 'Call Ended';
      default: return '';
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.background, '#1a1a2e', COLORS.surface]}
      style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <CoinDisplay coins={remainingCoins} showAddButton={false} size="small" />
          <View style={styles.rateInfo}>
            <Icon name="coins" size={14} color={COLORS.accent} />
            <Text style={styles.rateText}>{CALL_RATES.coinsPerMinute}/min</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.avatarContainer}>
              <Avatar
                name={callUser?.name}
                imageUrl={callUser?.profileImage}
                size={130}
              />
              {audioConnected && (
                <View style={styles.connectedBadge}>
                  <Icon name="phone-in-talk" size={18} color={COLORS.white} />
                </View>
              )}
            </View>
          </Animated.View>

          <Text style={styles.userName}>{callUser?.name || 'Unknown'}</Text>
          <Text style={styles.statusText}>{getStatusText()}</Text>

          {audioConnected && (
            <View style={styles.timerSection}>
              <Text style={styles.timerText}>{formatDuration(duration)}</Text>
            </View>
          )}

          {audioConnected && (
            <View style={styles.qualityContainer}>
              <View style={[styles.qualityDot, { backgroundColor: COLORS.success }]} />
              <Text style={styles.qualityText}>Audio Connected</Text>
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {audioConnected && (
            <View style={styles.controlsRow}>
              <TouchableOpacity onPress={handleToggleMute} style={styles.controlButton}>
                <View style={[styles.controlIconBg, isMuted && styles.controlIconBgActive]}>
                  <Icon
                    name={isMuted ? 'microphone-off' : 'microphone'}
                    size={26}
                    color={isMuted ? COLORS.white : COLORS.text}
                  />
                </View>
                <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleToggleSpeaker} style={styles.controlButton}>
                <View style={[styles.controlIconBg, isSpeakerOn && styles.controlIconBgActive]}>
                  <Icon
                    name={isSpeakerOn ? 'volume-high' : 'volume-medium'}
                    size={26}
                    color={isSpeakerOn ? COLORS.white : COLORS.text}
                  />
                </View>
                <Text style={styles.controlLabel}>Speaker</Text>
              </TouchableOpacity>
            </View>
          )}

          {status !== 'ended' && (
            <TouchableOpacity 
              onPress={() => handleEndCall(status === 'calling' ? 'cancelled' : 'user_ended')} 
              style={styles.endCallWrapper}>
              <LinearGradient colors={['#ff416c', '#ff4b2b']} style={styles.endCallButton}>
                <Icon name="phone-hangup" size={32} color={COLORS.white} />
              </LinearGradient>
              <Text style={styles.endCallLabel}>
                {status === 'calling' ? 'Cancel' : 'End Call'}
              </Text>
            </TouchableOpacity>
          )}

          {status === 'ended' && duration > 0 && (
            <View style={styles.callSummary}>
              <Icon name="check-circle" size={40} color={COLORS.success} />
              <Text style={styles.summaryTitle}>Call Ended</Text>
              <Text style={styles.summaryDuration}>Duration: {formatDuration(duration)}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  rateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  rateText: { fontSize: FONTS.sm, color: COLORS.textSecondary, marginLeft: 4 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  avatarWrapper: { marginBottom: SPACING.lg },
  avatarContainer: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  connectedBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.background,
  },
  userName: {
    fontSize: FONTS.xxl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  statusText: { fontSize: FONTS.base, color: COLORS.textSecondary },
  timerSection: { alignItems: 'center', marginTop: SPACING.xl },
  timerText: {
    fontSize: 48,
    fontWeight: '300',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  qualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
  },
  qualityDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.xs },
  qualityText: { fontSize: FONTS.sm, color: COLORS.textSecondary },
  controlsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  controlButton: { alignItems: 'center', marginHorizontal: SPACING.lg },
  controlIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  controlIconBgActive: { backgroundColor: COLORS.primary },
  controlLabel: { fontSize: FONTS.xs, color: COLORS.textSecondary },
  endCallWrapper: { alignItems: 'center' },
  endCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  endCallLabel: {
    fontSize: FONTS.sm,
    color: COLORS.danger,
    marginTop: SPACING.sm,
    fontWeight: '500',
  },
  callSummary: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.xl,
  },
  summaryTitle: {
    fontSize: FONTS.xl,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  summaryDuration: { fontSize: FONTS.base, color: COLORS.textSecondary, marginTop: SPACING.xs },
});

export default CallScreen;
