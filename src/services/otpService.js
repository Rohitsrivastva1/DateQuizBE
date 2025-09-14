const crypto = require('crypto');

// In-memory storage for OTPs (in production, use Redis or database)
const otpStorage = new Map();

/**
 * Generate a 6-digit OTP
 * @returns {string} - 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Store OTP with expiration
 * @param {string} email - User's email
 * @param {string} otp - OTP code
 * @param {number} expiresInMinutes - Expiration time in minutes (default: 10)
 * @returns {void}
 */
const storeOTP = (email, otp, expiresInMinutes = 10) => {
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  otpStorage.set(email, {
    otp,
    expiresAt,
    attempts: 0
  });
  
  // Clean up expired OTPs
  setTimeout(() => {
    otpStorage.delete(email);
  }, expiresInMinutes * 60 * 1000);
};

/**
 * Verify OTP
 * @param {string} email - User's email
 * @param {string} inputOTP - OTP entered by user
 * @returns {Object} - { valid: boolean, message: string }
 */
const verifyOTP = (email, inputOTP) => {
  const storedData = otpStorage.get(email);
  
  if (!storedData) {
    return { valid: false, message: 'OTP not found or expired' };
  }
  
  if (new Date() > storedData.expiresAt) {
    otpStorage.delete(email);
    return { valid: false, message: 'OTP has expired' };
  }
  
  if (storedData.attempts >= 3) {
    otpStorage.delete(email);
    return { valid: false, message: 'Too many failed attempts. Please request a new OTP' };
  }
  
  if (storedData.otp !== inputOTP) {
    storedData.attempts++;
    return { valid: false, message: 'Invalid OTP' };
  }
  
  // OTP is valid, remove it from storage
  otpStorage.delete(email);
  return { valid: true, message: 'OTP verified successfully' };
};

/**
 * Generate password reset token
 * @returns {string} - Reset token
 */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Store password reset token
 * @param {string} email - User's email
 * @param {string} token - Reset token
 * @param {number} expiresInHours - Expiration time in hours (default: 1)
 * @returns {void}
 */
const storeResetToken = (email, token, expiresInHours = 1) => {
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  otpStorage.set(`reset_${email}`, {
    token,
    expiresAt
  });
  
  // Clean up expired tokens
  setTimeout(() => {
    otpStorage.delete(`reset_${email}`);
  }, expiresInHours * 60 * 60 * 1000);
};

/**
 * Verify password reset token
 * @param {string} email - User's email
 * @param {string} token - Reset token
 * @returns {Object} - { valid: boolean, message: string }
 */
const verifyResetToken = (email, token) => {
  const storedData = otpStorage.get(`reset_${email}`);
  
  if (!storedData) {
    return { valid: false, message: 'Reset token not found or expired' };
  }
  
  if (new Date() > storedData.expiresAt) {
    otpStorage.delete(`reset_${email}`);
    return { valid: false, message: 'Reset token has expired' };
  }
  
  if (storedData.token !== token) {
    return { valid: false, message: 'Invalid reset token' };
  }
  
  return { valid: true, message: 'Reset token verified successfully' };
};

/**
 * Remove password reset token after successful reset
 * @param {string} email - User's email
 * @returns {void}
 */
const removeResetToken = (email) => {
  otpStorage.delete(`reset_${email}`);
};

/**
 * Get OTP info for debugging
 * @param {string} email - User's email
 * @returns {Object} - OTP info
 */
const getOTPInfo = (email) => {
  const storedData = otpStorage.get(email);
  if (!storedData) {
    return null;
  }
  
  return {
    otp: storedData.otp,
    expiresAt: storedData.expiresAt,
    attempts: storedData.attempts,
    isExpired: new Date() > storedData.expiresAt
  };
};

module.exports = {
  generateOTP,
  storeOTP,
  verifyOTP,
  generateResetToken,
  storeResetToken,
  verifyResetToken,
  removeResetToken,
  getOTPInfo
};
