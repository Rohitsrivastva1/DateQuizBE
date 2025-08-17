const express = require('express');

const { signupUser , loginUser, getUserProfile, savePushToken } = require('./authController');
const {protect} = require('../../middleware/authmiddleware');

const router = express.Router();

router.post('/signup', signupUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.post('/push-token', protect, savePushToken);

module.exports = router;
