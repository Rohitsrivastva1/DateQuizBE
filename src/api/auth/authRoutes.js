const express = require('express');

const { signupUser , loginUser, getUserProfile } = require('./authController');
const {protect} = require('../../middleware/authmiddleware');

const router = express.Router();

router.post('/signup', signupUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);

module.exports = router;
