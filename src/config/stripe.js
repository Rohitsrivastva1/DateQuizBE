// Google Play Billing Configuration (No Stripe)
const GOOGLE_PLAY_CONFIG = {
    // Subscription plans for Google Play
    PLANS: {
        'PREMIUM_MONTHLY': {
            id: 'premium_monthly_subscription',
            name: 'Premium Monthly',
            price: 999, // $9.99 in cents
            interval: 'month',
            description: 'Unlock all premium content for 30 days',
            features: [
                'Access to all premium question packs',
                'Unlimited partner turns',
                'Priority support',
                'Ad-free experience'
            ]
        },
        'PREMIUM_YEARLY': {
            id: 'premium_yearly_subscription',
            name: 'Premium Yearly',
            price: 9999, // $99.99 in cents
            interval: 'year',
            description: 'Unlock all premium content for 12 months',
            features: [
                'Access to all premium question packs',
                'Unlimited partner turns',
                'Priority support',
                'Ad-free experience',
                'Save 17% compared to monthly'
            ]
        }
    }
};

// Mock Stripe object for compatibility (will be removed)
const stripe = {
    paymentIntents: {
        create: () => Promise.reject(new Error('Stripe not available - use Google Play Billing')),
        retrieve: () => Promise.reject(new Error('Stripe not available - use Google Play Billing'))
    },
    customers: {
        create: () => Promise.reject(new Error('Stripe not available - use Google Play Billing')),
        retrieve: () => Promise.reject(new Error('Stripe not available - use Google Play Billing'))
    },
    subscriptions: {
        create: () => Promise.reject(new Error('Stripe not available - use Google Play Billing')),
        update: () => Promise.reject(new Error('Stripe not available - use Google Play Billing'))
    },
    webhooks: {
        constructEvent: () => Promise.reject(new Error('Stripe not available - use Google Play Billing'))
    }
};

// Legacy STRIPE_CONFIG for compatibility (will be removed)
const STRIPE_CONFIG = GOOGLE_PLAY_CONFIG;

// Webhook events (not used for Google Play Billing)
const WEBHOOK_EVENTS = {};

module.exports = {
    stripe,
    STRIPE_CONFIG,
    GOOGLE_PLAY_CONFIG,
    WEBHOOK_EVENTS
};
