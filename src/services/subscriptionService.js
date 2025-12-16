const db = require('../config/db');
const { logger } = require('../utils/secureLogger');

class SubscriptionService {
  constructor() {
    this.tiers = {
      free: 'free',
      premium_monthly: 'premium_monthly',
      premium_yearly: 'premium_yearly',
      lifetime: 'lifetime'
    };
  }

  // Get all available subscription tiers
  async getSubscriptionTiers() {
    try {
      const query = `
        SELECT id, name, display_name, description, price_usd, price_inr, 
               billing_period, features, storage_limit_mb, sort_order
        FROM subscription_tiers
        WHERE is_active = true
        ORDER BY sort_order ASC
      `;
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get subscription tiers', { error: error.message });
      throw error;
    }
  }

  // Get user's current subscription
  async getUserSubscription(userId) {
    try {
      const query = `
        SELECT us.*, st.name as tier_name, st.display_name, st.features, st.storage_limit_mb
        FROM user_subscriptions us
        JOIN subscription_tiers st ON us.tier_id = st.id
        WHERE us.user_id = $1 
        AND us.status = 'active'
        AND us.expires_at > NOW()
        ORDER BY us.expires_at DESC
        LIMIT 1
      `;
      const result = await db.query(query, [userId]);
      
      if (result.rows.length === 0) {
        // Return free tier as default
        return await this.getFreeTier();
      }
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get user subscription', { error: error.message, userId });
      throw error;
    }
  }

  // Get free tier details
  async getFreeTier() {
    try {
      const query = `
        SELECT id, name, display_name, description, features, storage_limit_mb
        FROM subscription_tiers
        WHERE name = 'free'
        LIMIT 1
      `;
      const result = await db.query(query);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get free tier', { error: error.message });
      throw error;
    }
  }

  // Create new subscription
  async createSubscription(subscriptionData) {
    const client = await db.query('BEGIN');
    
    try {
      const {
        userId,
        tierName,
        platform,
        transactionId,
        originalTransactionId,
        purchaseToken,
        receiptData,
        expiresAt
      } = subscriptionData;

      // Get tier info
      const tierQuery = `SELECT id, price_usd, price_inr FROM subscription_tiers WHERE name = $1`;
      const tierResult = await db.query(tierQuery, [tierName]);
      
      if (tierResult.rows.length === 0) {
        throw new Error('Invalid subscription tier');
      }
      
      const tier = tierResult.rows[0];

      // Check for existing active subscription
      const existingQuery = `
        SELECT id FROM user_subscriptions 
        WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
      `;
      const existingResult = await db.query(existingQuery, [userId]);
      
      if (existingResult.rows.length > 0) {
        // Cancel existing subscription before creating new one
        await this.cancelSubscription(userId, 'upgraded');
      }

      // Create new subscription
      const insertQuery = `
        INSERT INTO user_subscriptions (
          user_id, tier_id, status, platform, transaction_id,
          original_transaction_id, purchase_token, receipt_data, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      const insertResult = await db.query(insertQuery, [
        userId, tier.id, 'active', platform, transactionId,
        originalTransactionId || transactionId, purchaseToken, receiptData, expiresAt
      ]);

      const subscription = insertResult.rows[0];

      // Update user's subscription tier
      const updateUserQuery = `
        UPDATE users 
        SET subscription_tier = $1, subscription_expires_at = $2, updated_at = NOW()
        WHERE id = $3
      `;
      await db.query(updateUserQuery, [tierName, expiresAt, userId]);

      // Record in history
      await this.recordSubscriptionEvent(userId, subscription.id, 'purchased', tier.id, platform, transactionId, {
        amount_usd: tier.price_usd,
        amount_inr: tier.price_inr
      });

      await db.query('COMMIT');
      
      logger.info('Subscription created', { userId, tierName, transactionId });
      
      return subscription;
    } catch (error) {
      await db.query('ROLLBACK');
      logger.error('Failed to create subscription', { error: error.message, userId: subscriptionData.userId });
      throw error;
    }
  }

  // Renew existing subscription
  async renewSubscription(userId, transactionId, newExpiresAt) {
    try {
      const query = `
        UPDATE user_subscriptions
        SET expires_at = $1, 
            transaction_id = $2,
            payment_issue = false,
            last_verified_at = NOW(),
            updated_at = NOW()
        WHERE user_id = $3 AND status = 'active'
        RETURNING *
      `;
      const result = await db.query(query, [newExpiresAt, transactionId, userId]);
      
      if (result.rows.length > 0) {
        const subscription = result.rows[0];
        
        // Update user's expiration date
        await db.query(
          `UPDATE users SET subscription_expires_at = $1 WHERE id = $2`,
          [newExpiresAt, userId]
        );

        // Record renewal
        await this.recordSubscriptionEvent(userId, subscription.id, 'renewed', subscription.tier_id, subscription.platform, transactionId);
        
        logger.info('Subscription renewed', { userId, transactionId, expiresAt: newExpiresAt });
      }
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to renew subscription', { error: error.message, userId });
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(userId, reason = 'user_cancelled') {
    try {
      const query = `
        UPDATE user_subscriptions
        SET status = 'cancelled', 
            cancelled_at = NOW(),
            auto_renew = false,
            updated_at = NOW()
        WHERE user_id = $1 AND status = 'active'
        RETURNING *
      `;
      const result = await db.query(query, [userId]);
      
      if (result.rows.length > 0) {
        const subscription = result.rows[0];
        
        // Record cancellation
        await this.recordSubscriptionEvent(userId, subscription.id, 'cancelled', subscription.tier_id, subscription.platform, null, { reason });
        
        logger.info('Subscription cancelled', { userId, reason });
      }
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to cancel subscription', { error: error.message, userId });
      throw error;
    }
  }

  // Mark subscription as expired
  async expireSubscription(userId) {
    try {
      const query = `
        UPDATE user_subscriptions
        SET status = 'expired', updated_at = NOW()
        WHERE user_id = $1 AND status = 'active' AND expires_at <= NOW()
        RETURNING *
      `;
      const result = await db.query(query, [userId]);
      
      if (result.rows.length > 0) {
        const subscription = result.rows[0];
        
        // Update user to free tier
        await db.query(
          `UPDATE users SET subscription_tier = 'free', subscription_expires_at = NULL WHERE id = $1`,
          [userId]
        );

        // Record expiration
        await this.recordSubscriptionEvent(userId, subscription.id, 'expired', subscription.tier_id, subscription.platform);
        
        logger.info('Subscription expired', { userId });
      }
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to expire subscription', { error: error.message, userId });
      throw error;
    }
  }

  // Check and update expired subscriptions (run as cron job)
  async checkExpiredSubscriptions() {
    try {
      const query = `
        UPDATE user_subscriptions
        SET status = 'expired', updated_at = NOW()
        WHERE status = 'active' AND expires_at <= NOW()
        RETURNING user_id, id
      `;
      const result = await db.query(query);
      
      // Update users to free tier
      for (const row of result.rows) {
        await db.query(
          `UPDATE users SET subscription_tier = 'free', subscription_expires_at = NULL WHERE id = $1`,
          [row.user_id]
        );
        
        await this.recordSubscriptionEvent(row.user_id, row.id, 'expired');
      }
      
      logger.info('Expired subscriptions checked', { count: result.rows.length });
      
      return result.rows.length;
    } catch (error) {
      logger.error('Failed to check expired subscriptions', { error: error.message });
      throw error;
    }
  }

  // Record subscription event in history
  async recordSubscriptionEvent(userId, subscriptionId, eventType, tierId = null, platform = null, transactionId = null, metadata = {}) {
    try {
      const query = `
        INSERT INTO subscription_history (
          user_id, subscription_id, event_type, tier_id, platform, transaction_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;
      await db.query(query, [userId, subscriptionId, eventType, tierId, platform, transactionId, JSON.stringify(metadata)]);
    } catch (error) {
      logger.error('Failed to record subscription event', { error: error.message, userId, eventType });
      // Don't throw - this is logging, not critical
    }
  }

  // Check if user has feature access
  async hasFeatureAccess(userId, featureName) {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription || !subscription.features) {
        return false;
      }
      
      const features = typeof subscription.features === 'string' 
        ? JSON.parse(subscription.features) 
        : subscription.features;
      
      return features[featureName] === true || features[featureName] === -1;
    } catch (error) {
      logger.error('Failed to check feature access', { error: error.message, userId, featureName });
      return false;
    }
  }

  // Get feature limit for user
  async getFeatureLimit(userId, featureName) {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription || !subscription.features) {
        const freeTier = await this.getFreeTier();
        const freeFeatures = typeof freeTier.features === 'string' 
          ? JSON.parse(freeTier.features) 
          : freeTier.features;
        return freeFeatures[featureName] || 0;
      }
      
      const features = typeof subscription.features === 'string' 
        ? JSON.parse(subscription.features) 
        : subscription.features;
      
      return features[featureName] || 0;
    } catch (error) {
      logger.error('Failed to get feature limit', { error: error.message, userId, featureName });
      return 0;
    }
  }

  // Track feature usage
  async trackFeatureUsage(userId, featureName) {
    try {
      const query = `
        INSERT INTO subscription_feature_usage (user_id, feature_name, usage_count, reset_at)
        VALUES ($1, $2, 1, DATE_TRUNC('month', NOW() + INTERVAL '1 month'))
        ON CONFLICT (user_id, feature_name)
        DO UPDATE SET 
          usage_count = subscription_feature_usage.usage_count + 1,
          updated_at = NOW()
        RETURNING usage_count
      `;
      const result = await db.query(query, [userId, featureName]);
      return result.rows[0].usage_count;
    } catch (error) {
      logger.error('Failed to track feature usage', { error: error.message, userId, featureName });
      throw error;
    }
  }

  // Check if feature usage is within limit
  async canUseFeature(userId, featureName) {
    try {
      const limit = await this.getFeatureLimit(userId, featureName);
      
      // -1 means unlimited
      if (limit === -1) {
        return true;
      }
      
      // Get current usage
      const usageQuery = `
        SELECT usage_count FROM subscription_feature_usage
        WHERE user_id = $1 AND feature_name = $2
      `;
      const usageResult = await db.query(usageQuery, [userId, featureName]);
      
      const currentUsage = usageResult.rows[0]?.usage_count || 0;
      
      return currentUsage < limit;
    } catch (error) {
      logger.error('Failed to check feature usage', { error: error.message, userId, featureName });
      return false;
    }
  }

  // Get subscription history for user
  async getSubscriptionHistory(userId, limit = 50) {
    try {
      const query = `
        SELECT sh.*, st.display_name as tier_name
        FROM subscription_history sh
        LEFT JOIN subscription_tiers st ON sh.tier_id = st.id
        WHERE sh.user_id = $1
        ORDER BY sh.created_at DESC
        LIMIT $2
      `;
      const result = await db.query(query, [userId, limit]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get subscription history', { error: error.message, userId });
      throw error;
    }
  }

  // Get subscription stats
  async getSubscriptionStats() {
    try {
      const query = `
        SELECT 
          st.name as tier,
          COUNT(*) as count,
          SUM(CASE WHEN us.status = 'active' THEN 1 ELSE 0 END) as active_count
        FROM user_subscriptions us
        JOIN subscription_tiers st ON us.tier_id = st.id
        GROUP BY st.name
        ORDER BY st.sort_order
      `;
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get subscription stats', { error: error.message });
      throw error;
    }
  }

  // Verify iOS receipt (placeholder - integrate with Apple's server)
  async verifyIOSReceipt(receiptData, isProduction = false) {
    try {
      // TODO: Integrate with Apple's receipt validation API
      // https://developer.apple.com/documentation/appstorereceipts/verifyreceipt
      
      const appleUrl = isProduction
        ? 'https://buy.itunes.apple.com/verifyReceipt'
        : 'https://sandbox.itunes.apple.com/verifyReceipt';
      
      // For now, return mock verification
      logger.warn('iOS receipt verification not fully implemented', { receiptData: '***' });
      
      return {
        isValid: true,
        transactionId: 'mock_' + Date.now(),
        originalTransactionId: 'mock_orig_' + Date.now(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      };
    } catch (error) {
      logger.error('Failed to verify iOS receipt', { error: error.message });
      throw error;
    }
  }

  // Verify Android purchase (placeholder - integrate with Google Play)
  async verifyAndroidPurchase(purchaseToken, subscriptionId, isProduction = false) {
    try {
      // TODO: Integrate with Google Play Developer API
      // https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptions/get
      
      logger.warn('Android purchase verification not fully implemented', { purchaseToken: '***' });
      
      return {
        isValid: true,
        orderId: 'mock_' + Date.now(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      };
    } catch (error) {
      logger.error('Failed to verify Android purchase', { error: error.message });
      throw error;
    }
  }

  // Restore purchases for a user
  async restorePurchases(userId, platform, receipts) {
    try {
      const restoredSubscriptions = [];
      
      for (const receipt of receipts) {
        let verificationResult;
        
        if (platform === 'ios') {
          verificationResult = await this.verifyIOSReceipt(receipt.receiptData);
        } else if (platform === 'android') {
          verificationResult = await this.verifyAndroidPurchase(receipt.purchaseToken, receipt.productId);
        }
        
        if (verificationResult && verificationResult.isValid) {
          // Check if subscription already exists
          const existingQuery = `
            SELECT id FROM user_subscriptions
            WHERE user_id = $1 AND transaction_id = $2
          `;
          const existingResult = await db.query(existingQuery, [userId, verificationResult.transactionId || receipt.transactionId]);
          
          if (existingResult.rows.length === 0) {
            // Create new subscription
            const subscription = await this.createSubscription({
              userId,
              tierName: receipt.productId || 'premium_monthly',
              platform,
              transactionId: verificationResult.transactionId || receipt.transactionId,
              originalTransactionId: verificationResult.originalTransactionId || receipt.transactionId,
              purchaseToken: receipt.purchaseToken,
              receiptData: receipt.receiptData,
              expiresAt: verificationResult.expiresAt
            });
            
            restoredSubscriptions.push(subscription);
          }
        }
      }
      
      logger.info('Purchases restored', { userId, platform, count: restoredSubscriptions.length });
      
      return restoredSubscriptions;
    } catch (error) {
      logger.error('Failed to restore purchases', { error: error.message, userId, platform });
      throw error;
    }
  }

  // Create subscription from Google Play verification
  async createSubscriptionFromGooglePlay(userId, productId, googlePlayData, purchaseToken) {
    try {
      logger.info('Creating subscription from Google Play data', {
        userId,
        productId,
        orderId: googlePlayData.orderId
      });

      // Map Google Play product ID to tier
      const tierMapping = {
        'premium_monthly': 2, // Monthly subscription tier
        // Add more mappings as needed
      };

      const tierId = tierMapping[productId];
      if (!tierId) {
        throw new Error(`Unknown Google Play product ID: ${productId}`);
      }

      // Check if user already has an active subscription
      const existingSubscription = await this.getUserSubscription(userId);
      if (existingSubscription && existingSubscription.status === 'active') {
        logger.info('User already has active subscription, canceling previous one', {
          userId,
          existingSubscriptionId: existingSubscription.id
        });
        
        // Cancel existing subscription
        await this.cancelSubscription(userId, 'Upgraded via Google Play');
      }

      // Create new subscription
      const query = `
        INSERT INTO user_subscriptions (
          user_id, tier_id, status, start_date, end_date, 
          google_play_order_id, google_play_purchase_token, 
          auto_renewing, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `;

      const startDate = new Date(parseInt(googlePlayData.startTimeMillis));
      const endDate = googlePlayData.expiryTimeMillis ? 
        new Date(parseInt(googlePlayData.expiryTimeMillis)) : 
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

      const result = await db.query(query, [
        userId,
        tierId,
        'active',
        startDate,
        endDate,
        googlePlayData.orderId,
        purchaseToken,
        googlePlayData.autoRenewing || true
      ]);

      const subscription = result.rows[0];

      // Add subscription history entry
      await this.addSubscriptionHistory(userId, tierId, 'purchased', {
        google_play_order_id: googlePlayData.orderId,
        google_play_purchase_token: purchaseToken,
        source: 'google_play'
      });

      logger.info('Google Play subscription created successfully', {
        userId,
        subscriptionId: subscription.id,
        tierId
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to create subscription from Google Play data:', error);
      throw error;
    }
  }
}

// Create singleton instance
const subscriptionService = new SubscriptionService();

module.exports = subscriptionService;
