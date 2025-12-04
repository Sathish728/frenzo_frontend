export const validators = {
  phoneOrEmail: (value) => {
    if (!value) return 'Phone number or email is required';
    
    // Check if email
    if (value.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return 'Invalid email format';
      return null;
    }
    
    // Check if phone
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length < 10) return 'Phone number must be at least 10 digits';
    return null;
  },

  otp: (value) => {
    if (!value) return 'OTP is required';
    if (!/^\d{6}$/.test(value)) return 'OTP must be 6 digits';
    return null;
  },

  name: (value) => {
    if (!value) return 'Name is required';
    if (value.length < 2) return 'Name must be at least 2 characters';
    if (value.length > 50) return 'Name must not exceed 50 characters';
    return null;
  },

  upiId: (value) => {
    if (!value) return 'UPI ID is required';
    if (!/^[\w.-]+@[\w.-]+$/.test(value)) return 'Invalid UPI ID format';
    return null;
  },
};