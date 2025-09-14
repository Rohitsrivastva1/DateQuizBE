const { query } = require('../../config/db');
const { createUser, findUserByUsername, findUserByEmail } = require('../../services/db/userQueries');
const pushNotificationService = require('../../services/pushNotificationService');
const bcrypt = require('bcryptjs');
const tokenService = require('../../services/security/tokenService');

const signupUser = async (req, res) => {

    const { name, email, password,age,city } = req.body;

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

        const newUser = await createUser(name, email, hashedPassword, age, city);

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

module.exports = {
    signupUser,
    loginUser,
    getUserProfile,
    savePushToken
}
