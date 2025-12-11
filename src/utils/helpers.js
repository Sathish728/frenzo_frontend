import {CALL_RATES} from '../config/constants';

// Format duration in MM:SS
export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Format duration in HH:MM:SS
export const formatDurationLong = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Calculate earnings from coins
export const calculateEarnings = (coins) => {
  return (coins / 1000) * CALL_RATES.earningsPerThousandCoins;
};

// Calculate coins used for duration
export const calculateCoinsUsed = (durationSeconds) => {
  const minutes = durationSeconds / 60;
  return Math.ceil(minutes * CALL_RATES.coinsPerMinute);
};

// Format currency
export const formatCurrency = (amount, currency = '₹') => {
  return `${currency}${amount.toFixed(2)}`;
};

// Format number with commas
export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Sanitize phone number
export const sanitizePhone = (phone) => {
  return phone.replace(/[^0-9]/g, '');
};

// Format phone number for display
export const formatPhone = (phone) => {
  const cleaned = sanitizePhone(phone);
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

// Validate phone number
export const validatePhone = (phone) => {
  const cleaned = sanitizePhone(phone);
  return cleaned.length === 10 && /^[6-9]/.test(cleaned);
};

// Validate OTP
export const validateOTP = (otp) => {
  return /^\d{6}$/.test(otp);
};

// Validate name
export const validateName = (name) => {
  return name && name.trim().length >= 2 && name.trim().length <= 50;
};

// Validate UPI ID
export const validateUPI = (upiId) => {
  return /^[\w.\-]+@[\w]+$/.test(upiId);
};

// Get initials from name
export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

// Truncate text
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

// Format date
export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// Format time
export const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format date and time
export const formatDateTime = (date) => {
  return `${formatDate(date)} at ${formatTime(date)}`;
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

// Generate random ID
export const generateId = () => {
  return Math.random().toString(36).substring(2, 15);
};
