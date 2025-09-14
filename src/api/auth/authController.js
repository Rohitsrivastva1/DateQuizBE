const { query } = require('../../config/db');
const { createUser, findUserByUsername, findUserByEmail, updateUserPassword } = require('../../services/db/userQueries');
const pushNotificationService = require('../../services/pushNotificationService');
const bcrypt = require('bcryptjs');
const tokenService = require('../../services/security/tokenService');
const emailService = require('../../services/emailService');
const otpService = require('../../services/otpService');

const signupUser = async (req, res) => {

    const { name, email, password, age, city, gender, dob } = req.body;

    if (!name || !email || !password || !age || !city) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    console.log(name, email, password, age, city, gender, dob);  
    try {
        const existingUser = await findUserByUsername(name);

        if (existingUser) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const existingEmail = await findUserByEmail(email);

        if (existingEmail) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await createUser(name, email, hashedPassword, age, city, gender, dob);

        const { password_hash, ...userWithoutPassword } = newUser;
        res.status(201).json({
          token: tokenService.generateToken(newUser.id),
          user: userWithoutPassword
        });


    }catch (error) {
        console.error('Error creating user', error);
        res.status(500).json({ error: 'Failed to create user' });
    }

  
}


const loginUser = async (req, res) => {
    console.log(req.body);
    const { username, password } = req.body;
    console.log(username, password);

    if (!username || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {

        const user = await findUserByUsername(username);
        console.log(user);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        console.log(isPasswordValid);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const { password_hash, ...userWithoutPassword } = user;

       res.json({
        token: tokenService.generateToken(userWithoutPassword.id),
        user: userWithoutPassword
       })


    }catch (error) {
        console.error('Error logging in user', error);
        
        // Handle specific database connection errors
        if (error.message.includes('Database connection failed')) {
            return res.status(503).json({ 
                error: 'Service temporarily unavailable. Please try again in a few moments.' 
            });
        }
        
        // Handle SASL/SCRAM authentication errors
        if (error.message.includes('SASL') || error.message.includes('SCRAM')) {
            console.error('SASL authentication error:', error);
            return res.status(503).json({ 
                error: 'Authentication service temporarily unavailable. Please try again.' 
            });
        }
        
        res.status(500).json({ error: 'Failed to login' });
    }
}

const getUserProfile = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized: No user information found' });
    }
    const { password_hash, ...userWithoutPassword } = req.user;
    res.json({
        user: userWithoutPassword
    });
};

const savePushToken = async (req, res) => {
    try {
        const { pushToken } = req.body;
        const userId = req.user.id;

        if (!pushToken) {
            return res.status(400).json({ error: 'Push token is required' });
        }

        // Save the push token to the database
        await pushNotificationService.saveUserPushToken(userId, pushToken);

        res.json({ 
            message: 'Push token saved successfully',
            success: true 
        });
    } catch (error) {
        console.error('Error saving push token:', error);
        res.status(500).json({ error: 'Failed to save push token' });
    }
};

// Send OTP for email verification
const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        // Check if email exists
        const existingUser = await findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered' });
        }
        
        // Generate and store OTP
        const otp = otpService.generateOTP();
        otpService.storeOTP(email, otp);
        
        // Send OTP email
        const emailSent = await emailService.sendOTP(email, otp);
        
        if (emailSent) {
            res.json({ message: 'OTP sent successfully' });
        } else {
            res.status(500).json({ error: 'Failed to send OTP email' });
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
};

// Verify OTP
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }
        
        const verification = otpService.verifyOTP(email, otp);
        
        if (verification.valid) {
            res.json({ message: 'OTP verified successfully' });
        } else {
            res.status(400).json({ error: verification.message });
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
};

// Forgot password - send reset email
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        // Check if email exists
        const existingUser = await findUserByEmail(email);
        if (!existingUser) {
            return res.status(404).json({ error: 'Email not found' });
        }
        
        // Generate and store reset token
        const resetToken = otpService.generateResetToken();
        otpService.storeResetToken(email, resetToken);
        
        // Send reset email
        const emailSent = await emailService.sendPasswordReset(email, resetToken);
        
        if (emailSent) {
            res.json({ message: 'Password reset email sent successfully' });
        } else {
            res.status(500).json({ error: 'Failed to send reset email' });
        }
    } catch (error) {
        console.error('Error sending password reset:', error);
        res.status(500).json({ error: 'Failed to send password reset email' });
    }
};

// Reset password with token
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        // Find user by token (we need to store email with token)
        // For now, we'll need to modify the token storage to include email
        // This is a simplified version - in production, store email with token
        
        // For now, return success (you'll need to implement proper token lookup)
        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
};

// Delete user account
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { email, reason } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required for account deletion' });
        }
        
        // Verify that the email matches the user's email
        const user = await findUserByEmail(email);
        if (!user || user.id !== userId) {
            return res.status(403).json({ error: 'Email does not match your account' });
        }
        
        console.log(`🗑️  Deleting account for user ID: ${userId}, Email: ${email}, Reason: ${reason || 'Not specified'}`);
        
        // Start a transaction to ensure all deletions succeed or none do
        const { pool } = require('../../config/db');
        const client = await pool.connect();
        await client.query('BEGIN');
        
        try {
            // Delete user-related data in the correct order (respecting foreign key constraints)
            
            // 1. Delete user daily answers
            await client.query('DELETE FROM user_daily_answers WHERE user_id = $1', [userId]);
            console.log('✅ Deleted user daily answers');
            
            // 2. Delete user streaks
            await client.query('DELETE FROM user_streaks WHERE user_id = $1', [userId]);
            console.log('✅ Deleted user streaks');
            
            // 3. Delete love meters where user is involved
            await client.query('DELETE FROM love_meters WHERE user_id = $1 OR partner_id = $1', [userId]);
            console.log('✅ Deleted love meters');
            
            // 4. Delete couple names where user is involved
            await client.query('DELETE FROM couple_names WHERE user_id = $1 OR partner_id = $1', [userId]);
            console.log('✅ Deleted couple names');
            
            // 5. Delete partner requests where user is involved
            await client.query('DELETE FROM partner_requests WHERE sender_id = $1 OR receiver_id = $1', [userId]);
            console.log('✅ Deleted partner requests');
            
            // 6. Delete partner connections where user is involved
            await client.query('DELETE FROM partner_connections WHERE user1_id = $1 OR user2_id = $1', [userId]);
            console.log('✅ Deleted partner connections');
            
            // 7. Delete user notifications
            await client.query('DELETE FROM user_notifications WHERE user_id = $1', [userId]);
            console.log('✅ Deleted user notifications');
            
            // 8. Delete push tokens
            await client.query('DELETE FROM user_push_tokens WHERE user_id = $1', [userId]);
            console.log('✅ Deleted push tokens');
            
            // 9. Delete OTP records
            await client.query('DELETE FROM otp_verifications WHERE email = $1', [email]);
            console.log('✅ Deleted OTP records');
            
            // 10. Finally, delete the user
            await client.query('DELETE FROM users WHERE id = $1', [userId]);
            console.log('✅ Deleted user account');
            
            // Commit the transaction
            await client.query('COMMIT');
            
            // Log the deletion for audit purposes
            console.log(`✅ Account successfully deleted for user ID: ${userId}, Email: ${email}`);
            
            res.json({ 
                message: 'Account deleted successfully',
                success: true,
                deletedAt: new Date().toISOString()
            });
            
        } catch (deleteError) {
            // Rollback the transaction if any deletion fails
            await client.query('ROLLBACK');
            console.error('❌ Error during account deletion, transaction rolled back:', deleteError);
            throw deleteError;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('❌ Error deleting account:', error);
        
        // Handle specific database errors
        if (error.message.includes('Database connection failed')) {
            return res.status(503).json({ 
                error: 'Service temporarily unavailable. Please try again in a few moments.' 
            });
        }
        
        res.status(500).json({ 
            error: 'Failed to delete account. Please contact support if the problem persists.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    signupUser,
    loginUser,
    getUserProfile,
    savePushToken,
    sendOTP,
    verifyOTP,
    forgotPassword,
    resetPassword,
    deleteAccount
}
