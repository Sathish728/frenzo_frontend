// API Configuration
// For Android Emulator use: http://10.0.2.2:5000
// For Physical Device use your computer's IP: http://192.168.1.XXX:5000
export const API_URL = ' http://localhost:5000/api';
export const SOCKET_URL = ' http://localhost:5000';

// App Colors - Dark Theme
export const COLORS = {
  // Base
  background: '#0F172A',
  surface: '#1E293B',
  surfaceLight: '#334155',
  
  // Primary
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  
  // Secondary
  secondary: '#10B981',
  secondaryDark: '#059669',
  secondaryLight: '#34D399',
  
  // Accent
  accent: '#F59E0B',
  accentDark: '#D97706',
  accentLight: '#FBBF24',
  
  // Status
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  
  // Text
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  
  // Others
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(0, 0, 0, 0.5)',
  
  // Gradients (start, end)
  gradientPrimary: ['#6366F1', '#8B5CF6'],
  gradientSecondary: ['#10B981', '#14B8A6'],
  gradientDanger: ['#EF4444', '#F97316'],
  gradientGold: ['#F59E0B', '#FBBF24'],
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Font Sizes
export const FONTS = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 48,
};

// Border Radius
export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

// Call Rates
export const CALL_RATES = {
  coinsPerMinute: 40,
  earningsPerThousandCoins: 50, // ₹50 per 1000 coins
};

// Coin Packages
export const COIN_PACKAGES = [
  {id: 1, coins: 200, price: 20, bonus: 0},
  {id: 2, coins: 500, price: 50, bonus: 50},
  {id: 3, coins: 1000, price: 100, bonus: 150, popular: true},
  {id: 4, coins: 2500, price: 250, bonus: 500},
  {id: 5, coins: 5000, price: 500, bonus: 1500},
  {id: 6, coins: 10000, price: 1000, bonus: 4000},
];

// Withdrawal
export const WITHDRAWAL = {
  minimumCoins: 1000,
  payoutDay: 'Sunday',
};
