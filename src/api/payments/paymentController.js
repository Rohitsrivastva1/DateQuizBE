const { GOOGLE_PLAY_CONFIG } = require('../../config/stripe');
const subscriptionQueries = require('../../services/db/subscriptionQueries');
const { findUserById } = require('../../services/db/userQueries');

// Get available subscription plans
const getSubscriptionPlans = async (req, res) => {
    try {
        console.log('GET SUBSCRIPTION PLANS REQUEST');
        
        const plans = Object.values(GOOGLE_PLAY_CONFIG.PLANS);
        
        console.log('GET SUBSCRIPTION PLANS RESPONSE STATUS 200');
        console.log('GET SUBSCRIPTION PLANS RESPONSE DATA', { plans });
        
        res.json({ plans });
    } catch (error) {
        console.error('Error getting subscription plans:', error);
        res.status(500).json({ error: 'Failed to get subscription plans' });
    }
};

// Create mock payment intent for development (Google Play Billing handles this on device)
const createPaymentIntent = async (req, res) => {
    try {
        const { planId, paymentMethod = 'google_play' } = req.body;
        const userId = req.user.id;
        
        console.log('CREATE PAYMENT INTENT REQUEST', { planId, paymentMethod, userId });
        
        // Validate plan - handle both plan keys and product IDs
        let plan = GOOGLE_PLAY_CONFIG.PLANS[planId.toUpperCase()];
        
        // If not found by key, try to find by product ID
        if (!plan) {
            const planEntries = Object.entries(GOOGLE_PLAY_CONFIG.PLANS);
            const foundPlan = planEntries.find(([key, planData]) => planData.id === planId);
            if (foundPlan) {
                plan = foundPlan[1];
            }
        }
        
        if (!plan) {
            console.log('❌ Invalid plan selected:', planId);
            console.log('Available plans:', Object.keys(GOOGLE_PLAY_CONFIG.PLANS));
            console.log('Available product IDs:', Object.values(GOOGLE_PLAY_CONFIG.PLANS).map(p => p.id));
            return res.status(400).json({ error: 'Invalid plan selected' });
        }
        
        // Get user details
        const user = await findUserById(userId);
        if (!user) {
            console.log('❌ User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if user already has active subscription
        const hasActive = await subscriptionQueries.hasActiveSubscription(userId);
        if (hasActive) {
            console.log('❌ User already has active subscription:', userId);
            return res.status(400).json({ error: 'User already has an active subscription' });
        }
        
        console.log('✅ Google Play Billing - returning mock payment intent for development');
        
        res.json({
            clientSecret: 'pi_google_play_mock_secret',
            customerId: 'cus_google_play_mock',
            planId,
            paymentMethod: 'google_play',
            amount: plan.price,
            isMock: true,
            message: 'Use Google Play Billing on device for actual purchase'
        });
        
    } catch (error) {
        console.error('❌ Error creating payment intent:', error.message);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to create payment intent', details: error.message });
    }
};

// Create subscription after successful Google Play purchase
const createSubscription = async (req, res) => {
    try {
        const { paymentIntentId, planId } = req.body;
        const userId = req.user.id;
        
        console.log('CREATE SUBSCRIPTION REQUEST', { paymentIntentId, planId, userId });
        
        // Validate plan - handle both plan keys and product IDs
        let plan = GOOGLE_PLAY_CONFIG.PLANS[planId.toUpperCase()];
        
        // If not found by key, try to find by product ID
        if (!plan) {
            const planEntries = Object.entries(GOOGLE_PLAY_CONFIG.PLANS);
            const foundPlan = planEntries.find(([key, planData]) => planData.id === planId);
            if (foundPlan) {
                plan = foundPlan[1];
            }
        }
        
        if (!plan) {
            console.log('❌ Invalid plan selected:', planId);
            console.log('Available plans:', Object.keys(GOOGLE_PLAY_CONFIG.PLANS));
            console.log('Available product IDs:', Object.values(GOOGLE_PLAY_CONFIG.PLANS).map(p => p.id));
            return res.status(400).json({ error: 'Invalid plan selected' });
        }
        
        console.log('✅ Plan validated:', plan);
        
        // Get user
        const user = await findUserById(userId);
        if (!user) {
            console.log('❌ User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        console.log('✅ User found:', user.username);
        
        // Check if user already has active subscription
        const hasActive = await subscriptionQueries.hasActiveSubscription(userId);
        if (hasActive) {
            console.log('❌ User already has active subscription:', userId);
            return res.status(400).json({ error: 'User already has an active subscription' });
        }
        
        console.log('✅ No active subscription found, proceeding with Google Play subscription creation');
        
        // Create Google Play subscription record
        console.log('📝 Creating Google Play subscription record...');
        const subscriptionRecord = await subscriptionQueries.createUserSubscription(
            userId,
            null, // No Stripe customer ID for Google Play
            `google_play_${Date.now()}`, // Generate unique subscription ID
            plan.interval,
            {
                platform: 'google_play',
                planId,
                productId: plan.id,
                isMock: true // For development
            }
        );
        
        console.log('✅ Google Play subscription record created:', subscriptionRecord);
        
        // Create payment record
        console.log('📝 Creating Google Play payment record...');
        const paymentRecord = await subscriptionQueries.createPaymentRecord(
            userId,
            paymentIntentId,
            null,
            plan.price,
            'usd',
            'succeeded',
            'google_play',
            `DateQuiz Premium ${plan.name} Subscription (Google Play)`,
            {
                planId,
                productId: plan.id,
                platform: 'google_play',
                isMock: true
            }
        );
        
        console.log('✅ Google Play payment record created:', paymentRecord);
        
        console.log('CREATE SUBSCRIPTION RESPONSE STATUS 200 (GOOGLE PLAY)');
        console.log('CREATE SUBSCRIPTION RESPONSE DATA', { 
            subscriptionId: subscriptionRecord.stripe_subscription_id,
            status: 'active',
            platform: 'google_play'
        });
        
        return res.json({
            subscriptionId: subscriptionRecord.stripe_subscription_id,
            status: 'active',
            subscription: subscriptionRecord,
            platform: 'google_play'
        });
        
    } catch (error) {
        console.error('❌ Error in Google Play subscription creation:', error.message);
        console.error('❌ Error stack:', error.stack);
        return res.status(500).json({ error: 'Failed to create Google Play subscription', details: error.message });
    }
};

// Get user subscription status
const getUserSubscriptionStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        
        console.log('GET USER SUBSCRIPTION STATUS REQUEST', { userId });
        
        const subscription = await subscriptionQueries.getUserSubscription(userId);
        const hasActive = await subscriptionQueries.hasActiveSubscription(userId);
        
        console.log('GET USER SUBSCRIPTION STATUS RESPONSE STATUS 200');
        console.log('GET USER SUBSCRIPTION STATUS RESPONSE DATA', { 
            hasActive,
            subscription: subscription || null
        });
        
        res.json({
            hasActive,
            subscription: subscription || null
        });
    } catch (error) {
        console.error('Error getting subscription status:', error);
        res.status(500).json({ error: 'Failed to get subscription status' });
    }
};

// Cancel subscription (Google Play handles this)
const cancelSubscription = async (req, res) => {
    try {
        const userId = req.user.id;
        
        console.log('CANCEL SUBSCRIPTION REQUEST', { userId });
        
        const subscription = await subscriptionQueries.getUserSubscription(userId);
        if (!subscription) {
            return res.status(404).json({ error: 'No active subscription found' });
        }
        
        // Update local record to mark as canceled
        await subscriptionQueries.updateUserSubscription(subscription.stripe_subscription_id, {
            cancel_at_period_end: true,
            status: 'canceled'
        });
        
        console.log('CANCEL SUBSCRIPTION RESPONSE STATUS 200');
        console.log('CANCEL SUBSCRIPTION RESPONSE DATA', { 
            message: 'Subscription canceled. Google Play will handle the actual cancellation.'
        });
        
        res.json({
            message: 'Subscription canceled. Google Play will handle the actual cancellation.',
            cancelAtPeriodEnd: true
        });
    } catch (error) {
        console.error('Error canceling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
};

// Get payment history
const getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;
        
        console.log('GET PAYMENT HISTORY REQUEST', { userId, limit });
        
        const payments = await subscriptionQueries.getPaymentHistory(userId, limit);
        
        console.log('GET PAYMENT HISTORY RESPONSE STATUS 200');
        console.log('GET PAYMENT HISTORY RESPONSE DATA', { payments });
        
        res.json({ payments });
    } catch (error) {
        console.error('Error getting payment history:', error);
        res.status(500).json({ error: 'Failed to get payment history' });
    }
};

// Verify Google Play purchase (main function for Google Play Billing)
const verifyGooglePlayPurchase = async (req, res) => {
    try {
        const {
            purchaseToken,
            orderId,
            productId,
            purchaseTime,
            purchaseState,
            isAcknowledged,
            transactionReceipt
        } = req.body;
        
        const userId = req.user.id;
        
        console.log('VERIFY GOOGLE PLAY PURCHASE REQUEST', { 
            purchaseToken, 
            orderId, 
            productId, 
            userId 
        });
        
        // Validate purchase state
        if (purchaseState !== 0) { // 0 = purchased
            console.log('❌ Invalid purchase state:', purchaseState);
            return res.status(400).json({ error: 'Invalid purchase state' });
        }
        
        // Get user details
        const user = await findUserById(userId);
        if (!user) {
            console.log('❌ User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if user already has active subscription
        const hasActive = await subscriptionQueries.hasActiveSubscription(userId);
        if (hasActive) {
            console.log('❌ User already has active subscription:', userId);
            return res.status(400).json({ error: 'User already has an active subscription' });
        }
        
        // Determine plan from product ID
        const planId = productId === 'premium_yearly_subscription' ? 'PREMIUM_YEARLY' : 'PREMIUM_MONTHLY';
        const plan = GOOGLE_PLAY_CONFIG.PLANS[planId];
        
        if (!plan) {
            console.log('❌ Invalid product ID:', productId);
            return res.status(400).json({ error: 'Invalid product ID' });
        }
        
        console.log('✅ Plan validated:', plan);
        
        // Create subscription record
        console.log('📝 Creating Google Play subscription record...');
        const subscriptionRecord = await subscriptionQueries.createUserSubscription(
            userId,
            null, // No Stripe customer ID for Google Play
            orderId, // Use order ID as subscription ID
            plan.interval,
            {
                purchaseToken,
                productId,
                purchaseTime,
                isAcknowledged,
                platform: 'google_play'
            }
        );
        
        console.log('✅ Google Play subscription record created:', subscriptionRecord);
        
        // Create payment record
        console.log('📝 Creating Google Play payment record...');
        const paymentRecord = await subscriptionQueries.createPaymentRecord(
            userId,
            orderId,
            null,
            plan.price,
            'usd',
            'succeeded',
            'google_play',
            `DateQuiz Premium ${plan.name} Subscription (Google Play)`,
            {
                purchaseToken,
                productId,
                purchaseTime
            }
        );
        
        console.log('✅ Google Play payment record created:', paymentRecord);
        
        console.log('VERIFY GOOGLE PLAY PURCHASE RESPONSE STATUS 200');
        console.log('VERIFY GOOGLE PLAY PURCHASE RESPONSE DATA', { 
            subscriptionId: orderId,
            status: 'active'
        });
        
        res.json({
            subscriptionId: orderId,
            status: 'active',
            subscription: subscriptionRecord
        });
        
    } catch (error) {
        console.error('❌ Error verifying Google Play purchase:', error.message);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to verify purchase', details: error.message });
    }
};

// Webhook handler (not used for Google Play Billing)
const handleWebhook = async (req, res) => {
    console.log('WEBHOOK NOT SUPPORTED FOR GOOGLE PLAY BILLING');
    res.status(400).json({ error: 'Webhooks not supported for Google Play Billing' });
};

module.exports = {
    getSubscriptionPlans,
    createPaymentIntent,
    createSubscription,
    getUserSubscriptionStatus,
    cancelSubscription,
    getPaymentHistory,
    verifyGooglePlayPurchase,
    handleWebhook
};
