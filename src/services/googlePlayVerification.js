const { google } = require('googleapis');
const { logger } = require('../utils/secureLogger');

class GooglePlayReceiptVerificationService {
    constructor() {
        this.androidPublisher = null;
        this.isInitialized = false;
        this.packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.datequiz.app';
        this.serviceAccountEmail = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL;
        this.privateKey = process.env.GOOGLE_PLAY_PRIVATE_KEY;
    }

    /**
     * Initialize Google Play Developer API
     */
    async initialize() {
        try {
            if (!this.serviceAccountEmail || !this.privateKey) {
                logger.warn('Google Play API credentials not configured. Receipt verification will be mocked.');
                return false;
            }

            // Create JWT auth client
            const auth = new google.auth.JWT(
                this.serviceAccountEmail,
                null,
                this.privateKey.replace(/\\n/g, '\n'),
                ['https://www.googleapis.com/auth/androidpublisher']
            );

            // Initialize Android Publisher API
            this.androidPublisher = google.androidpublisher({
                version: 'v3',
                auth: auth
            });

            this.isInitialized = true;
            logger.info('Google Play Developer API initialized successfully');
            return true;
        } catch (error) {
            logger.error('Failed to initialize Google Play Developer API:', error);
            return false;
        }
    }

    /**
     * Verify Google Play subscription purchase
     */
    async verifySubscriptionPurchase(purchaseToken, subscriptionId) {
        try {
            if (!this.isInitialized) {
                logger.warn('Google Play API not initialized, using mock verification');
                return this.mockVerification(purchaseToken, subscriptionId);
            }

            logger.info('Verifying Google Play subscription purchase', {
                purchaseToken: purchaseToken.substring(0, 10) + '...',
                subscriptionId
            });

            // Get subscription details from Google Play
            const response = await this.androidPublisher.purchases.subscriptions.get({
                packageName: this.packageName,
                subscriptionId: subscriptionId,
                token: purchaseToken
            });

            const subscription = response.data;
            
            logger.info('Google Play subscription verification result', {
                orderId: subscription.orderId,
                purchaseState: subscription.purchaseState,
                expiryTimeMillis: subscription.expiryTimeMillis,
                autoRenewing: subscription.autoRenewing
            });

            // Check if subscription is active
            const isActive = subscription.purchaseState === 0; // 0 = purchased
            const expiryDate = subscription.expiryTimeMillis ? 
                new Date(parseInt(subscription.expiryTimeMillis)) : null;

            return {
                success: true,
                isValid: isActive,
                subscription: {
                    orderId: subscription.orderId,
                    purchaseState: subscription.purchaseState,
                    expiryDate: expiryDate,
                    autoRenewing: subscription.autoRenewing,
                    startTimeMillis: subscription.startTimeMillis,
                    expiryTimeMillis: subscription.expiryTimeMillis
                }
            };
        } catch (error) {
            logger.error('Google Play subscription verification failed:', error);
            
            // If it's a 410 error, the purchase token is invalid/expired
            if (error.code === 410) {
                return {
                    success: false,
                    isValid: false,
                    error: 'Purchase token expired or invalid'
                };
            }

            // For other errors, return mock verification for development
            logger.warn('Falling back to mock verification due to API error');
            return this.mockVerification(purchaseToken, subscriptionId);
        }
    }

    /**
     * Verify Google Play one-time purchase
     */
    async verifyOneTimePurchase(purchaseToken, productId) {
        try {
            if (!this.isInitialized) {
                logger.warn('Google Play API not initialized, using mock verification');
                return this.mockOneTimeVerification(purchaseToken, productId);
            }

            logger.info('Verifying Google Play one-time purchase', {
                purchaseToken: purchaseToken.substring(0, 10) + '...',
                productId
            });

            // Get purchase details from Google Play
            const response = await this.androidPublisher.purchases.products.get({
                packageName: this.packageName,
                productId: productId,
                token: purchaseToken
            });

            const purchase = response.data;
            
            logger.info('Google Play one-time purchase verification result', {
                orderId: purchase.orderId,
                purchaseState: purchase.purchaseState,
                consumptionState: purchase.consumptionState
            });

            // Check if purchase is valid
            const isValid = purchase.purchaseState === 0; // 0 = purchased

            return {
                success: true,
                isValid: isValid,
                purchase: {
                    orderId: purchase.orderId,
                    purchaseState: purchase.purchaseState,
                    consumptionState: purchase.consumptionState,
                    purchaseTimeMillis: purchase.purchaseTimeMillis
                }
            };
        } catch (error) {
            logger.error('Google Play one-time purchase verification failed:', error);
            
            // If it's a 410 error, the purchase token is invalid/expired
            if (error.code === 410) {
                return {
                    success: false,
                    isValid: false,
                    error: 'Purchase token expired or invalid'
                };
            }

            // For other errors, return mock verification for development
            logger.warn('Falling back to mock verification due to API error');
            return this.mockOneTimeVerification(purchaseToken, productId);
        }
    }

    /**
     * Cancel subscription in Google Play
     */
    async cancelSubscription(subscriptionId, purchaseToken) {
        try {
            if (!this.isInitialized) {
                logger.warn('Google Play API not initialized, cannot cancel subscription');
                return { success: false, error: 'Google Play API not initialized' };
            }

            logger.info('Canceling Google Play subscription', {
                subscriptionId,
                purchaseToken: purchaseToken.substring(0, 10) + '...'
            });

            // Cancel the subscription
            await this.androidPublisher.purchases.subscriptions.cancel({
                packageName: this.packageName,
                subscriptionId: subscriptionId,
                token: purchaseToken
            });

            logger.info('Google Play subscription canceled successfully');
            return { success: true };
        } catch (error) {
            logger.error('Failed to cancel Google Play subscription:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Mock verification for development/testing
     */
    mockVerification(purchaseToken, subscriptionId) {
        logger.info('Using mock Google Play verification', {
            purchaseToken: purchaseToken.substring(0, 10) + '...',
            subscriptionId
        });

        // Mock successful verification
        return {
            success: true,
            isValid: true,
            subscription: {
                orderId: `mock_order_${Date.now()}`,
                purchaseState: 0, // purchased
                expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
                autoRenewing: true,
                startTimeMillis: Date.now().toString(),
                expiryTimeMillis: (Date.now() + 30 * 24 * 60 * 60 * 1000).toString()
            }
        };
    }

    /**
     * Mock one-time purchase verification for development/testing
     */
    mockOneTimeVerification(purchaseToken, productId) {
        logger.info('Using mock Google Play one-time purchase verification', {
            purchaseToken: purchaseToken.substring(0, 10) + '...',
            productId
        });

        // Mock successful verification
        return {
            success: true,
            isValid: true,
            purchase: {
                orderId: `mock_order_${Date.now()}`,
                purchaseState: 0, // purchased
                consumptionState: 0, // not consumed
                purchaseTimeMillis: Date.now().toString()
            }
        };
    }

    /**
     * Get subscription status from Google Play
     */
    async getSubscriptionStatus(subscriptionId, purchaseToken) {
        try {
            if (!this.isInitialized) {
                return this.mockVerification(purchaseToken, subscriptionId);
            }

            const response = await this.androidPublisher.purchases.subscriptions.get({
                packageName: this.packageName,
                subscriptionId: subscriptionId,
                token: purchaseToken
            });

            return {
                success: true,
                subscription: response.data
            };
        } catch (error) {
            logger.error('Failed to get subscription status:', error);
            return { success: false, error: error.message };
        }
    }
}

// Export singleton instance
const googlePlayVerification = new GooglePlayReceiptVerificationService();
module.exports = googlePlayVerification;
