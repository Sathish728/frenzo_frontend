import {useDispatch, useSelector} from 'react-redux';

// Typed dispatch hook
export const useAppDispatch = () => useDispatch();

// Typed selector hook
export const useAppSelector = useSelector;

// Auth hook
export const useAuth = () => {
  const auth = useSelector((state) => state.auth);
  return {
    user: auth.user,
    token: auth.token,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
  };
};

// User hook
export const useUser = () => {
  const user = useSelector((state) => state.user);
  return {
    availableWomen: user.availableWomen,
    isLoadingWomen: user.isLoadingWomen,
    profile: user.profile,
    isOnline: user.isOnline,
    isAvailable: user.isAvailable,
    error: user.error,
  };
};

// Call hook
export const useCall = () => {
  const call = useSelector((state) => state.call);
  return {
    status: call.status,
    callId: call.callId,
    remoteUser: call.remoteUser,
    duration: call.duration,
    coinsUsed: call.coinsUsed,
    coinsEarned: call.coinsEarned,
    isMuted: call.isMuted,
    isSpeakerOn: call.isSpeakerOn,
    endReason: call.endReason,
    error: call.error,
  };
};

// Payment hook
export const usePayment = () => {
  const payment = useSelector((state) => state.payment);
  return {
    packages: payment.packages,
    transactions: payment.transactions,
    withdrawals: payment.withdrawals,
    earnings: payment.earnings,
    isLoading: payment.isLoading,
    isProcessing: payment.isProcessing,
    error: payment.error,
  };
};
