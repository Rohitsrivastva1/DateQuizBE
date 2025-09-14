const nodemailer = require('nodemailer');

// Email configuration
const EMAIL_USER = process.env.EMAIL_USER || 'schoolabe10@gmail.com';
const EMAIL_PASS = process.env.EMAIL_PASS || 'ejmv ddd'; // Note: This should be an App Password, not regular password

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service configuration error:', error);
    console.error('❌ Make sure you are using an App Password, not your regular Gmail password');
    console.error('❌ Enable 2-Factor Authentication and generate an App Password');
  } else {
    console.log('✅ Email service is ready to send messages');
    console.log('✅ Using email:', EMAIL_USER);
  }
});

/**
 * Send OTP for email verification
 * @param {string} email - User's email address
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<boolean>} - Success status
 */
const sendOTP = async (email, otp) => {
  try {
    const mailOptions = {
      from: `"DateQuiz" <${EMAIL_USER}>`,
      to: email,
      subject: 'Verify Your Email - DateQuiz',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #ff69b4, #ff8da1); padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to DateQuiz!</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Fun Questions & Games</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin: 0 0 20px 0;">Verify Your Email Address</h2>
            <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0;">
              Thank you for signing up! To complete your registration and start enjoying fun questions and games, please verify your email address.
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="color: #333; margin: 0 0 10px 0; font-weight: bold;">Your verification code is:</p>
              <div style="background: #ff69b4; color: white; font-size: 32px; font-weight: bold; padding: 15px 30px; border-radius: 8px; letter-spacing: 5px; display: inline-block;">
                ${otp}
              </div>
            </div>
            
            <p style="color: #666; font-size: 14px; margin: 20px 0 0 0;">
              This code will expire in 10 minutes. If you didn't request this verification, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© 2024 DateQuiz - Fun Questions & Games</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    console.error('❌ Error details:', error.message);
    if (error.code === 'EAUTH') {
      console.error('❌ Authentication failed. Please check your Gmail App Password.');
    }
    return false;
  }
};

/**
 * Send password reset email
 * @param {string} email - User's email address
 * @param {string} resetToken - Password reset token
 * @returns {Promise<boolean>} - Success status
 */
const sendPasswordReset = async (email, resetToken) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"DateQuiz" <${EMAIL_USER}>`,
      to: email,
      subject: 'Reset Your Password - DateQuiz',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #ff69b4, #ff8da1); padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">DateQuiz - Fun Questions & Games</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin: 0 0 20px 0;">Reset Your Password</h2>
            <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0;">
              We received a request to reset your password. Click the button below to create a new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #ff69b4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin: 20px 0 0 0;">
              This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
            </p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #ff69b4; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© 2024 DateQuiz - Fun Questions & Games</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return false;
  }
};

/**
 * Send welcome email after successful registration
 * @param {string} email - User's email address
 * @param {string} username - User's username
 * @returns {Promise<boolean>} - Success status
 */
const sendWelcomeEmail = async (email, username) => {
  try {
    const mailOptions = {
      from: `"DateQuiz" <${EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to DateQuiz! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background: linear-gradient(135deg, #ff69b4, #ff8da1); padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to DateQuiz!</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Fun Questions & Games</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 10px; margin-top: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin: 0 0 20px 0;">Hi ${username}! 👋</h2>
            <p style="color: #666; line-height: 1.6; margin: 0 0 20px 0;">
              Welcome to DateQuiz! You're all set to start discovering fun questions and games to share with friends and partners.
            </p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 15px 0;">What you can do:</h3>
              <ul style="color: #666; margin: 0; padding-left: 20px;">
                <li>Answer daily questions</li>
                <li>Explore question packs</li>
                <li>Connect with friends and partners</li>
                <li>Share fun activities together</li>
                <li>Build connections through conversation</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background: #ff69b4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                Start Playing Now!
              </a>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            <p>© 2024 DateQuiz - Fun Questions & Games</p>
            <p>This email was sent to ${email}</p>
          </div>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return false;
  }
};

module.exports = {
  sendOTP,
  sendPasswordReset,
  sendWelcomeEmail
};
