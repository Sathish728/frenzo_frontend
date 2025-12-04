export const API_URL = __DEV__ 
  ? 'http://10.0.2.2:5000'  // Android emulator
  : 'http://YOUR_EC2_IP:5000';

export const SOCKET_URL = __DEV__
  ? 'http://10.0.2.2:5000'
  : 'http://YOUR_EC2_IP:5000';

export const COLORS = {
  primary: '#2196F3',
  secondary: '#4CAF50',
  danger: '#f44336',
  warning: '#FF9800',
  success: '#4CAF50',
  info: '#00BCD4',
  background: '#f5f5f5',
  card: '#ffffff',
  text: '#333333',
  textLight: '#666666',
  textMuted: '#999999',
  border: '#e0e0e0',
  white: '#ffffff',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const SIZES = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
};

export const COINS_PER_MINUTE = 40;
export const MONEY_PER_1000_COINS = 50;
export const MIN_WITHDRAWAL_COINS = 1000;
