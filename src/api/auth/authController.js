const { query } = require('../../config/db');
const { createUser, findUserByUsername, findUserByEmail } = require('../../services/db/userQueries');
const pushNotificationService = require('../../services/pushNotificationService');
const bcrypt = require('bcryptjs');
const tokenService = require('../../services/security/tokenService');

const signupUser = async (req, res) => {

    const { name, email, password, age, city, gender, dob } = req.body;

    if (!name || !email || !password || !age || !city) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    console.log(name, email, password, age, city);  
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
        // Map username to name for frontend compatibility
        const userForResponse = {
          ...userWithoutPassword,
          name: userWithoutPassword.username  // Map username to name
        };
        res.status(201).json({
          token: tokenService.generateToken(newUser.id),
          user: userForResponse
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

const forgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        // Check if user exists
        const user = await findUserByEmail(email);
        
        if (!user) {
            // For security, don't reveal if email exists or not
            return res.status(200).json({ 
                message: 'If the email exists, a password reset link has been sent' 
            });
        }

        // Generate a simple reset token (in production, use a proper token system)
        const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        
        // Store reset token temporarily (in production, store in database with expiration)
        // For now, we'll just log it
        console.log(`Password reset token for ${email}: ${resetToken}`);
        
        // Send reset email using the same email service as OTP
        const otpService = require('../../services/otpService');
        const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        
        const emailSent = await otpService.sendResetEmail(email, resetLink);
        
        if (!emailSent) {
            return res.status(500).json({ 
                error: 'Failed to send reset email. Please try again.' 
            });
        }

        res.status(200).json({ 
            message: 'Password reset link sent to your email address' 
        });

    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ 
            error: 'Failed to process password reset request' 
        });
    }
};

const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
    }

    try {
        // In production, validate token from database
        // For now, we'll just log it
        console.log(`Password reset attempt with token: ${token}`);
        
        // For demo purposes, we'll accept any token
        // In production, you'd validate the token and get the user ID
        res.status(200).json({ 
            message: 'Password reset successfully' 
        });

    } catch (error) {
        console.error('Error in reset password:', error);
        res.status(500).json({ 
            error: 'Failed to reset password' 
        });
    }
};

module.exports = {
    signupUser,
    loginUser,
    getUserProfile,
    savePushToken,
    forgotPassword,
    resetPassword
}
