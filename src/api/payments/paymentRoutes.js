const express = require('express');
const router = express.Router();
const paymentController = require('./paymentController');
const { protect } = require('../../middleware/authmiddleware');

// Public routes (no authentication required)
router.get('/plans', paymentController.getSubscriptionPlans);
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

// Protected routes (authentication required)
router.use(protect);

// Subscription management
router.post('/create-payment-intent', paymentController.createPaymentIntent);
router.post('/create-subscription', paymentController.createSubscription);
router.post('/verify-google-play-purchase', paymentController.verifyGooglePlayPurchase);
router.get('/subscription-status', paymentController.getUserSubscriptionStatus);
router.post('/cancel-subscription', paymentController.cancelSubscription);
router.get('/payment-history', paymentController.getPaymentHistory);

module.exports = router;
