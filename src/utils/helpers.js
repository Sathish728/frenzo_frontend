import {CALL_RATES} from '../config/constants';

/**
 * Format duration in MM:SS
 */
export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format duration in HH:MM:SS
 */
export const formatDurationLong = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Calculate earnings from coins
 */
export const calculateEarnings = (coins) => {
  return (coins / 1000) * CALL_RATES.earningsPerThousandCoins;
};

/**
 * Calculate coins used for duration
 */
export const calculateCoinsUsed = (durationSeconds) => {
  const minutes = durationSeconds / 60;
  return Math.ceil(minutes * CALL_RATES.coinsPerMinute);
};

/**
 * Format currency
 */
export const formatCurrency = (amount, currency = '₹') => {
  return `${currency}${amount.toFixed(2)}`;
};

/**
 * Format number with commas and abbreviations
 */
export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Sanitize phone number - remove non-digits
 */
export const sanitizePhone = (phone) => {
  return phone.replace(/[^0-9]/g, '');
};

/**
 * Format phone number for display
 */
export const formatPhone = (phone) => {
  const cleaned = sanitizePhone(phone);
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

/**
 * Validate Indian phone number
 */
export const validatePhone = (phone) => {
  const cleaned = sanitizePhone(phone);
  return cleaned.length === 10 && /^[6-9]/.test(cleaned);
};

/**
 * Validate OTP (6 digits)
 */
export const validateOTP = (otp) => {
  return /^\d{6}$/.test(otp);
};

/**
 * Validate name (2-50 characters)
 */
export const validateName = (name) => {
  return name && name.trim().length >= 2 && name.trim().length <= 50;
};

/**
 * Validate UPI ID format
 */
export const validateUPI = (upiId) => {
  return /^[\w.\-]+@[\w]+$/.test(upiId);
};

/**
 * Get initials from name
 */
export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
};

/**
 * Format date
 */
export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Format time
 */
export const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format date and time
 */
export const formatDateTime = (date) => {
  return `${formatDate(date)} at ${formatTime(date)}`;
};

/**
 * Get relative time (e.g., "2 hours ago")
 */
export const getRelativeTime = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

/**
 * Throttle function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Generate random ID
 */
export const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Sleep/delay function
 */
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

/**
 * Deep clone object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Capitalize first letter
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Get call quality indicator based on stats
 */
export const getCallQuality = (stats) => {
  if (!stats) return 'unknown';
  
  const {packetsLost, packetsReceived, jitter} = stats;
  
  if (packetsLost === undefined || packetsReceived === undefined) {
    return 'unknown';
  }
  
  const lossRate = packetsReceived > 0 
    ? (packetsLost / (packetsLost + packetsReceived)) * 100 
    : 0;
  
  if (lossRate < 1 && (!jitter || jitter < 0.03)) {
    return 'excellent';
  } else if (lossRate < 3 && (!jitter || jitter < 0.05)) {
    return 'good';
  } else if (lossRate < 8 && (!jitter || jitter < 0.1)) {
    return 'fair';
  } else {
    return 'poor';
  }
};

/**
 * Format file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};