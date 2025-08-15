const db = require('../../config/db');

// User Subscription Queries
const createUserSubscription = async (userId, stripeCustomerId, stripeSubscriptionId, planType, metadata = null) => {
    try {
        // Try with metadata column first
        const query = `
            INSERT INTO user_subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan_type, metadata)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const { rows } = await db.query(query, [userId, stripeCustomerId, stripeSubscriptionId, planType, metadata ? JSON.stringify(metadata) : null]);
        return rows[0];
    } catch (error) {
        if (error.message.includes('column "metadata" does not exist')) {
            // Fallback without metadata column
            console.log('⚠️ Metadata column not found, creating subscription without metadata');
            const query = `
                INSERT INTO user_subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan_type)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const { rows } = await db.query(query, [userId, stripeCustomerId, stripeSubscriptionId, planType]);
            return rows[0];
        }
        throw error;
    }
};

const updateUserSubscription = async (stripeSubscriptionId, updates) => {
    const setClause = Object.keys(updates).map((key, index) => `${key} = $${index + 2}`).join(', ');
    const query = `
        UPDATE user_subscriptions 
        SET ${setClause}
        WHERE stripe_subscription_id = $1
        RETURNING *
    `;
    const values = [stripeSubscriptionId, ...Object.values(updates)];
    const { rows } = await db.query(query, values);
    return rows[0];
};

const getUserSubscription = async (userId) => {
    const query = `
        SELECT * FROM user_subscriptions 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
    `;
    const { rows } = await db.query(query, [userId]);
    return rows[0];
};

const getUserSubscriptionByStripeId = async (stripeSubscriptionId) => {
    const query = `
        SELECT * FROM user_subscriptions 
        WHERE stripe_subscription_id = $1
    `;
    const { rows } = await db.query(query, [stripeSubscriptionId]);
    return rows[0];
};

const hasActiveSubscription = async (userId) => {
    const query = `
        SELECT EXISTS(
            SELECT 1 FROM user_subscriptions 
            WHERE user_id = $1 
            AND status = 'active' 
            AND (current_period_end IS NULL OR current_period_end > NOW())
        ) as has_access
    `;
    const { rows } = await db.query(query, [userId]);
    return rows[0].has_access;
};

// Payment History Queries
const createPaymentRecord = async (userId, stripePaymentIntentId, stripeInvoiceId, amount, currency, status, paymentMethod, description, metadata = null) => {
    try {
        // Try with metadata column first
        const query = `
            INSERT INTO payment_history (user_id, stripe_payment_intent_id, stripe_invoice_id, amount, currency, status, payment_method, description, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const { rows } = await db.query(query, [userId, stripePaymentIntentId, stripeInvoiceId, amount, currency, status, paymentMethod, description, metadata ? JSON.stringify(metadata) : null]);
        return rows[0];
    } catch (error) {
        if (error.message.includes('column "metadata" does not exist')) {
            // Fallback without metadata column
            console.log('⚠️ Metadata column not found, creating payment record without metadata');
            const query = `
                INSERT INTO payment_history (user_id, stripe_payment_intent_id, stripe_invoice_id, amount, currency, status, payment_method, description)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `;
            const { rows } = await db.query(query, [userId, stripePaymentIntentId, stripeInvoiceId, amount, currency, status, paymentMethod, description]);
            return rows[0];
        }
        throw error;
    }
};

const updatePaymentStatus = async (stripePaymentIntentId, status) => {
    const query = `
        UPDATE payment_history 
        SET status = $2 
        WHERE stripe_payment_intent_id = $1
        RETURNING *
    `;
    const { rows } = await db.query(query, [stripePaymentIntentId, status]);
    return rows[0];
};

const getPaymentHistory = async (userId, limit = 10) => {
    const query = `
        SELECT * FROM payment_history 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
    `;
    const { rows } = await db.query(query, [userId, limit]);
    return rows;
};

// Premium Content Access Queries
const grantPremiumAccess = async (userId, packId, expiresAt = null) => {
    const query = `
        INSERT INTO premium_content_access (user_id, pack_id, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, pack_id) 
        DO UPDATE SET 
            access_granted_at = NOW(),
            expires_at = $3
        RETURNING *
    `;
    const { rows } = await db.query(query, [userId, packId, expiresAt]);
    return rows[0];
};

const hasPackAccess = async (userId, packId) => {
    const query = `
        SELECT has_pack_access($1, $2) as has_access
    `;
    const { rows } = await db.query(query, [userId, packId]);
    return rows[0].has_access;
};

const getPremiumPacks = async (userId) => {
    const query = `
        SELECT p.*, 
               CASE WHEN p.is_premium = true THEN has_pack_access($1, p.id) ELSE true END as has_access
        FROM packs p
        WHERE p.is_premium = true
        ORDER BY p.id
    `;
    const { rows } = await db.query(query, [userId]);
    return rows.map(pack => ({
        ...pack,
        isPremium: pack.is_premium === 'true',
        hasAccess: pack.has_access
    }));
};

const getAllPacksWithAccess = async (userId, category = null) => {
    let query = `
        SELECT p.*, 
               CASE WHEN p.is_premium = true THEN has_pack_access($1, p.id) ELSE true END as has_access
        FROM packs p
    `;
    const queryParams = [userId];
    
    if (category) {
        query += ` WHERE p.category = $2`;
        queryParams.push(category);
    }
    
    query += ` ORDER BY p.id`;
    
    const { rows } = await db.query(query, queryParams);
    return rows.map(pack => ({
        ...pack,
        isPremium: pack.is_premium === 'true',
        hasAccess: pack.has_access
    }));
};

// Cleanup expired access
const cleanupExpiredAccess = async () => {
    const query = `
        DELETE FROM premium_content_access 
        WHERE expires_at IS NOT NULL 
        AND expires_at < NOW()
    `;
    const { rowCount } = await db.query(query);
    return rowCount;
};

module.exports = {
    // Subscription management
    createUserSubscription,
    updateUserSubscription,
    getUserSubscription,
    getUserSubscriptionByStripeId,
    hasActiveSubscription,
    
    // Payment management
    createPaymentRecord,
    updatePaymentStatus,
    getPaymentHistory,
    
    // Premium content access
    grantPremiumAccess,
    hasPackAccess,
    getPremiumPacks,
    getAllPacksWithAccess,
    cleanupExpiredAccess
};
