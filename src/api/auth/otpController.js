const otpService = require('../../services/otpService');

/**
 * Send OTP to email
 * POST /api/auth/send-otp
 */
const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ 
                error: 'Email is required' 
            });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'Please enter a valid email address' 
            });
        }

        // Check if OTP already exists and is still valid
        if (otpService.hasOTP(email)) {
            return res.status(429).json({ 
                error: 'OTP already sent. Please wait before requesting a new one.' 
            });
        }

        // Generate and store OTP
        const otp = otpService.generateOTP();
        otpService.storeOTP(email, otp);

        // Send OTP via email
        const emailSent = await otpService.sendOTPEmail(email, otp);
        
        if (!emailSent) {
            return res.status(500).json({ 
                error: 'Failed to send OTP. Please try again.' 
            });
        }

        console.log(`✅ OTP sent to ${email}: ${otp}`);
        
        res.status(200).json({ 
            message: 'OTP sent successfully to your email address'
        });

    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ 
            error: 'Failed to send OTP. Please try again.' 
        });
    }
};

/**
 * Verify OTP
 * POST /api/auth/verify-otp
 */
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ 
                error: 'Email and OTP are required' 
            });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                error: 'Please enter a valid email address' 
            });
        }

        // Basic OTP validation
        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({ 
                error: 'Please enter a valid 6-digit OTP' 
            });
        }

        // Verify OTP
        const verification = otpService.verifyOTP(email, otp);
        
        if (!verification.valid) {
            return res.status(400).json({ 
                error: verification.message 
            });
        }

        console.log(`✅ OTP verified for ${email}`);
        
        res.status(200).json({ 
            message: 'OTP verified successfully',
            verified: true
        });

    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ 
            error: 'Failed to verify OTP. Please try again.' 
        });
    }
};

module.exports = {
    sendOTP,
    verifyOTP
};
