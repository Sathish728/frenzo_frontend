import React, {useEffect, useState, useRef, useCallback} from 'react';
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
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch, useSelector} from 'react-redux';

import {COLORS, FONTS, SPACING, RADIUS, CALL_RATES} from '../../config/constants';
import {
  callConnected,
  callAnswered,
  incrementDuration,
  toggleMute,
  toggleSpeaker,
  endCall,
  resetCall,
  callFailed,
} from '../../redux/slices/callSlice';
import {updateCoins} from '../../redux/slices/authSlice';
import socketService from '../../services/socketService';
import webRTCService from '../../services/webrtcService';
import {requestCallPermissions} from '../../utils/permissions';
import Avatar from '../../components/common/Avatar';
import CoinDisplay from '../../components/CoinDisplay';
import {formatNumber} from '../../utils/helpers';

const CallScreen = ({navigation, route}) => {
  const dispatch = useDispatch();
  const {woman} = route.params || {};
  const {user} = useSelector((state) => state.auth);
  const {
    status,
    duration,
    isMuted,
    isSpeakerOn,
    remoteUser,
    callId,
    endReason,
    error,
  } = useSelector((state) => state.call);

  const timerRef = useRef(null);
  const coinDeductionRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const [localCoinsUsed, setLocalCoinsUsed] = useState(0);
  const [callTimeout, setCallTimeout] = useState(null);
  const [audioConnected, setAudioConnected] = useState(false);
  const [webrtcInitialized, setWebrtcInitialized] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);

  // Request permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      const permissions = await requestCallPermissions();
      if (!permissions.microphone) {
        Alert.alert(
          'Microphone Required',
          'Cannot make voice calls without microphone access.',
          [{text: 'OK', onPress: () => navigation.goBack()}]
        );
      }
    };
    checkPermissions();
  }, []);

  // Setup WebRTC when call is answered (we are the caller)
  useEffect(() => {
    if (status === 'connecting' || status === 'connected') {
      if (!webrtcInitialized) {
        initializeWebRTC();
      }
    }
  }, [status]);

  const initializeWebRTC = async () => {
    const targetUserId = woman?._id || remoteUser?._id;
    if (!targetUserId) {
      console.error('📞 CallScreen: No target user ID');
      return;
    }

    console.log('📞 CallScreen: Initializing WebRTC as CALLER to:', targetUserId);
    
    // Setup WebRTC with socket service
    webRTCService.setSocketService(socketService);
    
    // Set callbacks
    webRTCService.setCallbacks({
      onRemoteStream: (stream) => {
        console.log('📞 CallScreen: Remote audio stream received!');
        setAudioConnected(true);
      },
      onConnectionStateChange: (state) => {
        console.log('📞 CallScreen: WebRTC connection state:', state);
        if (state === 'connected' || state === 'completed') {
          setAudioConnected(true);
          Vibration.vibrate(100);
        }
      },
      onCallConnected: () => {
        console.log('📞 CallScreen: WebRTC call connected!');
        setAudioConnected(true);
        dispatch(callConnected());
      },
      onCallEnded: (reason) => {
        console.log('📞 CallScreen: WebRTC call ended:', reason);
        handleEndCall(reason);
      },
    });

    // Initialize as caller - this will create offer and send it
    const initialized = await webRTCService.initializeAsCaller(targetUserId, callId);
    setWebrtcInitialized(initialized);
    
    if (!initialized) {
      console.error('📞 CallScreen: Failed to initialize WebRTC');
      Alert.alert('Error', 'Failed to establish audio connection');
    }
  };

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (status === 'connected') {
        Alert.alert(
          'End Call?',
          'Are you sure you want to end this call?',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'End Call', onPress: () => handleEndCall(), style: 'destructive'},
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
  }, [status]);

  // Animations
  useEffect(() => {
    if (status === 'calling' || status === 'connecting') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(ringAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(ringAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
      ringAnim.setValue(0);
    }
  }, [status]);

  // Call timeout (30 seconds for unanswered calls)
  useEffect(() => {
    if (status === 'calling') {
      const timeout = setTimeout(() => {
        if (status === 'calling') {
          console.log('📞 CallScreen: Call timeout - no answer');
          dispatch(callFailed({reason: 'no_answer', error: 'No answer'}));
        }
      }, 30000);
      
      setCallTimeout(timeout);
      return () => clearTimeout(timeout);
    }
  }, [status]);

  // Timer for connected call
  useEffect(() => {
    if (status === 'connected') {
      console.log('📞 CallScreen: Starting call timer');
      setCallStartTime(Date.now());
      
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
  }, [status, dispatch]);

  // Coin deduction every 60 seconds
  useEffect(() => {
    if (status === 'connected') {
      // First deduction after 60 seconds
      coinDeductionRef.current = setInterval(() => {
        const coinsToDeduct = CALL_RATES.coinsPerMinute;
        const currentCoins = user?.coins || 0;

        console.log(`📞 CallScreen: Coin check - have ${currentCoins}, need ${coinsToDeduct}`);

        if (currentCoins < coinsToDeduct) {
          console.log('📞 CallScreen: Insufficient coins, ending call');
          handleEndCall('insufficient_coins');
          return;
        }

        // Deduct coins
        dispatch(updateCoins(currentCoins - coinsToDeduct));
        setLocalCoinsUsed(prev => prev + coinsToDeduct);
        console.log(`📞 CallScreen: Deducted ${coinsToDeduct} coins`);
      }, 60000);

      return () => {
        if (coinDeductionRef.current) {
          clearInterval(coinDeductionRef.current);
          coinDeductionRef.current = null;
        }
      };
    }
  }, [status, user?.coins, dispatch]);

  // Handle call status changes
  useEffect(() => {
    if (status === 'ended') {
      // Clear all timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (coinDeductionRef.current) {
        clearInterval(coinDeductionRef.current);
        coinDeductionRef.current = null;
      }
      if (callTimeout) {
        clearTimeout(callTimeout);
      }

      // Cleanup WebRTC
      webRTCService.cleanup();

      let message = 'Call ended';
      let title = 'Call Ended';
      let shouldAlert = false;

      switch (endReason) {
        case 'insufficient_coins':
          title = 'Low Balance';
          message = 'Your coin balance is too low to continue the call.';
          shouldAlert = true;
          break;
        case 'busy':
          title = 'User Busy';
          message = 'This user is currently on another call.';
          shouldAlert = true;
          break;
        case 'rejected':
          title = 'Call Declined';
          message = 'The user declined your call.';
          shouldAlert = true;
          break;
        case 'no_answer':
          title = 'No Answer';
          message = 'The user did not answer.';
          shouldAlert = true;
          break;
        case 'failed':
        case 'connection_failed':
          title = 'Call Failed';
          message = error || 'Unable to connect. Please try again.';
          shouldAlert = true;
          break;
        case 'disconnected':
          title = 'Disconnected';
          message = 'The call was disconnected.';
          shouldAlert = true;
          break;
      }

      if (shouldAlert) {
        Alert.alert(title, message, [
          {
            text: 'OK',
            onPress: () => {
              dispatch(resetCall());
              navigation.goBack();
            },
          },
        ]);
      } else {
        setTimeout(() => {
          dispatch(resetCall());
          navigation.goBack();
        }, 2000);
      }
    }
  }, [status, endReason, error, dispatch, navigation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('📞 CallScreen: Unmounting, cleaning up...');
      webRTCService.cleanup();
      if (timerRef.current) clearInterval(timerRef.current);
      if (coinDeductionRef.current) clearInterval(coinDeductionRef.current);
      if (callTimeout) clearTimeout(callTimeout);
    };
  }, []);

  const handleEndCall = useCallback((reason = 'user_ended') => {
    console.log('📞 CallScreen: Ending call, reason:', reason);
    
    // Clear timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (coinDeductionRef.current) {
      clearInterval(coinDeductionRef.current);
      coinDeductionRef.current = null;
    }
    if (callTimeout) {
      clearTimeout(callTimeout);
    }

    // Cleanup WebRTC
    webRTCService.cleanup();

    // Notify server
    socketService.endCall(callId);
    
    dispatch(endCall({reason, duration, coinsUsed: localCoinsUsed}));
  }, [callId, callTimeout, duration, localCoinsUsed, dispatch]);

  const handleToggleMute = useCallback(() => {
    webRTCService.toggleMute();
    dispatch(toggleMute());
  }, [dispatch]);

  const handleToggleSpeaker = useCallback(() => {
    webRTCService.toggleSpeaker();
    dispatch(toggleSpeaker());
  }, [dispatch]);

  const callUser = woman || remoteUser;
  const remainingCoins = Math.max(0, (user?.coins || 0));

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (status) {
      case 'calling':
        return 'Ringing...';
      case 'connecting':
        return webrtcInitialized ? 'Connecting Audio...' : 'Setting up...';
      case 'connected':
        return audioConnected ? 'Connected' : 'Connecting Audio...';
      case 'ended':
        switch (endReason) {
          case 'busy': return 'User Busy';
          case 'rejected': return 'Call Declined';
          case 'no_answer': return 'No Answer';
          case 'failed': return 'Call Failed';
          default: return 'Call Ended';
        }
      default:
        return '';
    }
  };

  const ringIconOpacity = ringAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

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
          <Animated.View style={[styles.avatarWrapper, {transform: [{scale: pulseAnim}]}]}>
            <View style={styles.avatarContainer}>
              {(status === 'calling' || status === 'connecting') && (
                <>
                  <Animated.View style={[styles.ringOuter, {opacity: ringIconOpacity}]} />
                  <Animated.View style={[styles.ringInner, {opacity: ringIconOpacity}]} />
                </>
              )}
              
              <Avatar
                name={callUser?.name}
                imageUrl={callUser?.profileImage}
                size={130}
              />
              
              {status === 'connected' && audioConnected && (
                <View style={styles.connectedBadge}>
                  <Icon name="phone-in-talk" size={18} color={COLORS.white} />
                </View>
              )}
            </View>
          </Animated.View>

          <Text style={styles.userName}>{callUser?.name || 'Unknown'}</Text>
          
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>

          {(status === 'connected' || (status === 'ended' && duration > 0)) && (
            <View style={styles.timerSection}>
              <Text style={styles.timerText}>{formatDuration(duration)}</Text>
              {status === 'connected' && (
                <View style={styles.coinsInfo}>
                  <Icon name="circle-multiple" size={14} color={COLORS.accent} />
                  <Text style={styles.coinsUsedText}>
                    {localCoinsUsed} coins used
                  </Text>
                </View>
              )}
            </View>
          )}

          {status === 'connected' && audioConnected && (
            <View style={styles.qualityContainer}>
              <View style={[styles.qualityDot, {backgroundColor: COLORS.success}]} />
              <Text style={styles.qualityText}>Audio Connected</Text>
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {status === 'connected' && (
            <View style={styles.controlsRow}>
              <TouchableOpacity
                onPress={handleToggleMute}
                style={styles.controlButton}
                activeOpacity={0.7}>
                <View style={[styles.controlIconBg, isMuted && styles.controlIconBgActive]}>
                  <Icon
                    name={isMuted ? 'microphone-off' : 'microphone'}
                    size={26}
                    color={isMuted ? COLORS.white : COLORS.text}
                  />
                </View>
                <Text style={[styles.controlLabel, isMuted && styles.controlLabelActive]}>
                  {isMuted ? 'Unmute' : 'Mute'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleToggleSpeaker}
                style={styles.controlButton}
                activeOpacity={0.7}>
                <View style={[styles.controlIconBg, isSpeakerOn && styles.controlIconBgActive]}>
                  <Icon
                    name={isSpeakerOn ? 'volume-high' : 'volume-medium'}
                    size={26}
                    color={isSpeakerOn ? COLORS.white : COLORS.text}
                  />
                </View>
                <Text style={[styles.controlLabel, isSpeakerOn && styles.controlLabelActive]}>
                  Speaker
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {status !== 'ended' && (
            <TouchableOpacity 
              onPress={() => handleEndCall(status === 'calling' ? 'cancelled' : 'user_ended')} 
              activeOpacity={0.8}
              style={styles.endCallWrapper}>
              <LinearGradient
                colors={['#ff416c', '#ff4b2b']}
                style={styles.endCallButton}>
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
              <Text style={styles.summaryCoins}>Coins Used: {localCoinsUsed}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1},
  safeArea: {flex: 1},
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
  rateText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  avatarWrapper: {marginBottom: SPACING.lg},
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  ringInner: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
  },
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
  statusContainer: {flexDirection: 'row', alignItems: 'center'},
  statusText: {fontSize: FONTS.base, color: COLORS.textSecondary},
  timerSection: {alignItems: 'center', marginTop: SPACING.xl},
  timerText: {
    fontSize: 48,
    fontWeight: '300',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  coinsInfo: {flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xs},
  coinsUsedText: {fontSize: FONTS.sm, color: COLORS.accent, marginLeft: 4},
  qualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
  },
  qualityDot: {width: 8, height: 8, borderRadius: 4, marginRight: SPACING.xs},
  qualityText: {fontSize: FONTS.sm, color: COLORS.textSecondary},
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
  controlButton: {alignItems: 'center', marginHorizontal: SPACING.lg},
  controlIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  controlIconBgActive: {backgroundColor: COLORS.primary},
  controlLabel: {fontSize: FONTS.xs, color: COLORS.textSecondary},
  controlLabelActive: {color: COLORS.primary},
  endCallWrapper: {alignItems: 'center'},
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
  summaryDuration: {fontSize: FONTS.base, color: COLORS.textSecondary, marginTop: SPACING.xs},
  summaryCoins: {fontSize: FONTS.sm, color: COLORS.accent, marginTop: SPACING.xs},
});

export default CallScreen;