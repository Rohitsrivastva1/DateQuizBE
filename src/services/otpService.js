const crypto = require('crypto');

class OTPService {
    constructor() {
        // Store OTPs in memory (in production, use Redis or database)
        this.otpStore = new Map();
        this.otpExpiry = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Generate a 6-digit OTP
     * @returns {string} 6-digit OTP
     */
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Store OTP for an email
     * @param {string} email 
     * @param {string} otp 
     */
    storeOTP(email, otp) {
        const expiryTime = Date.now() + this.otpExpiry;
        this.otpStore.set(email, {
            otp,
            expiryTime,
            attempts: 0
        });
        
        // Clean up expired OTPs
        this.cleanupExpiredOTPs();
    }

    /**
     * Verify OTP for an email
     * @param {string} email 
     * @param {string} otp 
     * @returns {object} { valid: boolean, message: string }
     */
    verifyOTP(email, otp) {
        const storedData = this.otpStore.get(email);
        
        if (!storedData) {
            return { valid: false, message: 'OTP not found or expired' };
        }

        if (Date.now() > storedData.expiryTime) {
            this.otpStore.delete(email);
            return { valid: false, message: 'OTP expired' };
        }

        if (storedData.attempts >= 3) {
            this.otpStore.delete(email);
            return { valid: false, message: 'Too many failed attempts' };
        }

        if (storedData.otp !== otp) {
            storedData.attempts++;
            return { valid: false, message: 'Invalid OTP' };
        }

        // OTP is valid, remove it
        this.otpStore.delete(email);
        return { valid: true, message: 'OTP verified successfully' };
    }

    /**
     * Check if OTP exists for email
     * @param {string} email 
     * @returns {boolean}
     */
    hasOTP(email) {
        const storedData = this.otpStore.get(email);
        if (!storedData) return false;
        
        if (Date.now() > storedData.expiryTime) {
            this.otpStore.delete(email);
            return false;
        }
        
        return true;
    }

    /**
     * Clean up expired OTPs
     */
    cleanupExpiredOTPs() {
        const now = Date.now();
        for (const [email, data] of this.otpStore.entries()) {
            if (now > data.expiryTime) {
                this.otpStore.delete(email);
            }
        }
    }

    /**
     * Send OTP via email (mock implementation)
     * In production, integrate with email service like SendGrid, AWS SES, etc.
     * @param {string} email 
     * @param {string} otp 
     * @returns {Promise<boolean>}
     */
    async sendOTPEmail(email, otp) {
        try {
            // Mock email sending - in production, replace with actual email service
            console.log(`📧 Mock OTP Email sent to ${email}: ${otp}`);
            console.log(`📧 In production, this would be sent via email service`);
            
            // Simulate email sending delay
            await new Promise(resolve => setTimeout(resolve, 100));
            
            return true;
        } catch (error) {
            console.error('Error sending OTP email:', error);
            return false;
        }
    }
}

module.exports = new OTPService();
