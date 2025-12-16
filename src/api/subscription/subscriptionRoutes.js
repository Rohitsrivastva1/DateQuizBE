const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { protect } = require('../../middleware/authmiddleware');
const { handleValidationErrors } = require('../../middleware/inputValidation');
const {
  getSubscriptionTiers,
  getUserSubscription,
  purchaseSubscription,
  cancelSubscription,
  restorePurchases,
  getSubscriptionHistory,
  checkFeatureAccess,
  getSubscriptionStats,
  verifyPurchase
} = require('./subscriptionController');

// Public routes (no authentication required)
router.get('/tiers', getSubscriptionTiers);

// Protected routes (authentication required)
router.use(protect);

// Get user's current subscription
router.get('/my-subscription', getUserSubscription);

// Purchase subscription
router.post('/purchase',
  [
    body('tierId')
      .isString()
      .notEmpty()
      .withMessage('Tier ID required'),
    body('receiptData')
      .isObject()
      .withMessage('Receipt data required')
  ],
  handleValidationErrors,
  purchaseSubscription
);

// Verify Google Play purchase
router.post('/verify-purchase',
  [
    body('purchaseToken')
      .isString()
      .notEmpty()
      .withMessage('Purchase token required'),
    body('productId')
      .isString()
      .notEmpty()
      .withMessage('Product ID required'),
    body('transactionId')
      .optional()
      .isString()
      .withMessage('Transaction ID must be string'),
    body('transactionDate')
      .optional()
      .isString()
      .withMessage('Transaction date must be string'),
    body('transactionReceipt')
      .optional()
      .isString()
      .withMessage('Transaction receipt must be string')
  ],
  handleValidationErrors,
  verifyPurchase
);

// Cancel subscription
router.post('/cancel',
  [
    body('reason')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Reason must be max 500 characters')
  ],
  handleValidationErrors,
  cancelSubscription
);

// Restore purchases
router.post('/restore', restorePurchases);

// Verify subscription
router.post('/verify', getUserSubscription);

// Get subscription history
router.get('/history',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ],
  handleValidationErrors,
  getSubscriptionHistory
);

// Check feature access
router.get('/feature/:feature', 
  [
    param('feature')
      .isString()
      .notEmpty()
      .withMessage('Feature name required')
  ],
  handleValidationErrors,
  checkFeatureAccess
);

module.exports = router;
