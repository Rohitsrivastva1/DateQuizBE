const crypto = require('crypto');
const nodemailer = require('nodemailer');

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
     * Create email transporter
     * @returns {object} Nodemailer transporter
     */
    createTransporter() {
        return nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER || 'schoolabe10@gmail.com',
                pass: process.env.EMAIL_PASS || 'ejmv hrau cogi qqxx'
            }
        });
    }

    /**
     * Send OTP via email using Gmail SMTP
     * @param {string} email 
     * @param {string} otp 
     * @returns {Promise<boolean>}
     */
    async sendOTPEmail(email, otp) {
        try {
            const transporter = this.createTransporter();
            
            const mailOptions = {
                from: process.env.EMAIL_USER || 'schoolabe10@gmail.com',
                to: email,
                subject: 'DateQuiz - Email Verification Code',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #e91e63; font-size: 28px; margin: 0;">DateQuiz</h1>
                            <p style="color: #666; font-size: 16px; margin: 10px 0;">Your Dating Adventure Awaits!</p>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
                            <h2 style="color: #333; margin-bottom: 20px;">Email Verification</h2>
                            <p style="color: #666; font-size: 16px; margin-bottom: 25px;">
                                Please use the following verification code to complete your account setup:
                            </p>
                            
                            <div style="background: #e91e63; color: white; font-size: 32px; font-weight: bold; padding: 20px; border-radius: 8px; letter-spacing: 5px; margin: 20px 0;">
                                ${otp}
                            </div>
                            
                            <p style="color: #666; font-size: 14px; margin-top: 20px;">
                                This code will expire in 5 minutes.
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px; color: #999; font-size: 12px;">
                            <p>If you didn't request this code, please ignore this email.</p>
                            <p>© 2024 DateQuiz. All rights reserved.</p>
                        </div>
                    </div>
                `
            };

            const result = await transporter.sendMail(mailOptions);
            console.log(`📧 OTP Email sent to ${email}: ${otp}`);
            console.log(`📧 Message ID: ${result.messageId}`);
            
            return true;
        } catch (error) {
            console.error('Error sending OTP email:', error);
            return false;
        }
    }
}

module.exports = new OTPService();
