export const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const calculateEarnings = (coins) => {
  return ((coins / 1000) * 50).toFixed(2);
};

export const sanitizePhone = (phone) => {
  return phone.replace(/\D/g, '');
};

export const isEmail = (value) => {
  return value.includes('@');
};

export const getIdentifierType = (value) => {
  return isEmail(value) ? 'email' : 'phone';
};

export const formatIdentifier = (identifier) => {
  if (isEmail(identifier)) {
    return identifier.toLowerCase().trim();
  }
  return sanitizePhone(identifier);
};