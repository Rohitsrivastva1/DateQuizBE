const subscriptionService = require('../../services/subscriptionService');
const googlePlayVerification = require('../../services/googlePlayVerification');
const { logger } = require('../../utils/secureLogger');

// Get all available subscription tiers
const getSubscriptionTiers = async (req, res) => {
  try {
    const tiers = await subscriptionService.getSubscriptionTiers();
    
    res.json({
      success: true,
      data: tiers
    });
  } catch (error) {
    logger.error('Failed to get subscription tiers', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to load subscription tiers'
    });
  }
};

// Get user's current subscription
const getUserSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const subscription = await subscriptionService.getUserSubscription(userId);
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No subscription found'
      });
    }
    
    res.json({
      success: true,
      subscription: subscription
    });
  } catch (error) {
    logger.error('Failed to get user subscription', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to load subscription'
    });
  }
};

// Purchase subscription
const purchaseSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tierId, receiptData } = req.body;

    // Validate required fields
    if (!tierId || !receiptData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tierId, receiptData'
      });
    }

    // For now, we'll use mock verification since we don't have real IAP setup
    // In production, you would verify the receipt with Apple/Google
    const subscription = await subscriptionService.createSubscription({
      userId,
      tierName: tierId, // Map tierId to tierName for the service
      receiptData,
      platform: receiptData.platform || 'ios',
      transactionId: receiptData.transactionId || `mock_${Date.now()}`,
      originalTransactionId: receiptData.originalTransactionId || receiptData.transactionId,
      purchaseToken: receiptData.purchaseToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    });

    logger.info('Subscription purchased', { userId, tierId });

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      subscription: subscription
    });
  } catch (error) {
    logger.error('Failed to purchase subscription', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process purchase'
    });
  }
};

// Cancel subscription
const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;

    const subscription = await subscriptionService.cancelSubscription(userId, reason || 'user_cancelled');
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No active subscription found'
      });
    }

    logger.info('Subscription cancelled by user', { userId, reason });

    res.json({
      success: true,
      message: 'Subscription cancelled. You will retain access until the end of your billing period.',
      data: subscription
    });
  } catch (error) {
    logger.error('Failed to cancel subscription', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
};

// Restore purchases
const restorePurchases = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // For now, just return the user's current subscription
    // In production, you would restore from Apple/Google receipts
    const subscription = await subscriptionService.getUserSubscription(userId);

    logger.info('Purchases restore attempted', { userId });

    res.json({
      success: true,
      message: subscription ? 'Subscription restored' : 'No subscription found to restore',
      subscription: subscription
    });
  } catch (error) {
    logger.error('Failed to restore purchases', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to restore purchases'
    });
  }
};

// Get subscription history
const getSubscriptionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit } = req.query;

    const history = await subscriptionService.getSubscriptionHistory(userId, parseInt(limit) || 50);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Failed to get subscription history', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to load subscription history'
    });
  }
};

// Check feature access
const checkFeatureAccess = async (req, res) => {
  try {
    const userId = req.user.id;
    const { feature } = req.params;

    const hasAccess = await subscriptionService.hasFeatureAccess(userId, feature);
    const limit = await subscriptionService.getFeatureLimit(userId, feature);

    res.json({
      success: true,
      data: {
        feature,
        hasAccess,
        limit
      }
    });
  } catch (error) {
    logger.error('Failed to check feature access', { error: error.message, userId: req.user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to check feature access'
    });
  }
};

// Admin: Get subscription stats
const getSubscriptionStats = async (req, res) => {
  try {
    const stats = await subscriptionService.getSubscriptionStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get subscription stats', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to load subscription statistics'
    });
  }
};

// Verify Google Play purchase
const verifyPurchase = async (req, res) => {
  try {
    const { purchaseToken, productId, transactionId, transactionDate, transactionReceipt } = req.body;
    const userId = req.user.id;

    if (!purchaseToken || !productId) {
      return res.status(400).json({
        success: false,
        error: 'Purchase token and product ID are required'
      });
    }

    logger.info('Verifying Google Play purchase', {
      userId,
      productId,
      transactionId: transactionId?.substring(0, 10) + '...'
    });

    // Verify with Google Play
    const verificationResult = await googlePlayVerification.verifySubscriptionPurchase(
      purchaseToken,
      productId
    );

    if (!verificationResult.success || !verificationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: verificationResult.error || 'Invalid purchase'
      });
    }

    // Create or update subscription in database
    const subscription = await subscriptionService.createSubscriptionFromGooglePlay(
      userId,
      productId,
      verificationResult.subscription,
      purchaseToken
    );

    logger.info('Google Play purchase verified successfully', {
      userId,
      subscriptionId: subscription.id
    });

    res.json({
      success: true,
      subscription: subscription,
      message: 'Purchase verified successfully'
    });
  } catch (error) {
    logger.error('Failed to verify Google Play purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify purchase'
    });
  }
};

module.exports = {
  getSubscriptionTiers,
  getUserSubscription,
  purchaseSubscription,
  cancelSubscription,
  restorePurchases,
  getSubscriptionHistory,
  checkFeatureAccess,
  getSubscriptionStats,
  verifyPurchase
};
