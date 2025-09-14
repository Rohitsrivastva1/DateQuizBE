const express = require('express');

const { signupUser , loginUser, getUserProfile, savePushToken, sendOTP, verifyOTP, forgotPassword, resetPassword, deleteAccount } = require('./authController');
const {protect} = require('../../middleware/authmiddleware');

const router = express.Router();

router.post('/signup', signupUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.post('/push-token', protect, savePushToken);

// Email verification routes
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Account deletion route
router.delete('/delete-account', protect, deleteAccount);

module.exports = router;
