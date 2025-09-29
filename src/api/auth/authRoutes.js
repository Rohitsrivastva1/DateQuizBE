const express = require('express');

const { signupUser , loginUser, getUserProfile, savePushToken, forgotPassword, resetPassword, changePassword } = require('./authController');
const { sendOTP, verifyOTP } = require('./otpController');
const {protect} = require('../../middleware/authmiddleware');

const router = express.Router();

router.post('/signup', signupUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.get('/me', protect, getUserProfile);
router.post('/push-token', protect, savePushToken);

// OTP routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', protect, changePassword);

module.exports = router;
