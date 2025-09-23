const { User } = require('../models');
const TokenService = require('./tokenService');
const EmailService = require('./emailService');
const SMSService = require('./smsService');
const bcrypt = require('bcryptjs');

class PasswordResetService {
  // Request password reset via email
  static async requestEmailReset(email) {
    try {
      const user = await User.findOne({ where: { email } });

      if (!user) {
        // Don't reveal whether email exists
        return true;
      }

      // Generate reset token
      const resetToken = TokenService.generateToken();
      const expirationTime = TokenService.getExpirationTime(1); 

      // Save token to user
      await user.update({
        reset_token: resetToken,
        reset_token_expires: expirationTime
      });

      // Send reset email
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      
      await EmailService.sendEmail(
        user.email,
        'Password Reset Request',
        `You requested a password reset. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 1 hour.`,
        `
          <h2>Password Reset Request</h2>
          <p>You requested a password reset. Click the button below to reset your password:</p>
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      );

      return true;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  // Request password reset via SMS
  static async requestSMSReset(phoneNumber) {
    try {
      const user = await User.findOne({ where: { phone_number: phoneNumber } });

      if (!user) {
        // Don't reveal whether phone exists
        return true;
      }

      // Generate reset code
      const resetCode = TokenService.generateVerificationCode();
      const expirationTime = TokenService.getExpirationTime(0.5); // 30 minutes

      // Save code to user (we'll use phone_verification_code for reset)
      await user.update({
        phone_verification_code: resetCode,
        phone_verification_expires: expirationTime
      });

      // Send SMS with reset code
      await SMSService.sendSMS(
        user.phone_number,
        `Your password reset code is: ${resetCode}. This code will expire in 30 minutes.`
      );

      return true;
    } catch (error) {
      console.error('Error sending password reset SMS:', error);
      throw error;
    }
  }

  // Reset password with token (email)
  static async resetPasswordWithToken(token, newPassword) {
    try {
      const user = await User.findOne({
        where: { reset_token: token }
      });

      if (!user) {
        throw new Error('Invalid reset token.');
      }

      if (TokenService.isTokenExpired(user.reset_token_expires)) {
        throw new Error('Reset token has expired.');
      }

      // Hash new password
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear reset token
      await user.update({
        password_hash,
        reset_token: null,
        reset_token_expires: null
      });

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Reset password with code (SMS)
  static async resetPasswordWithCode(phoneNumber, code, newPassword) {
    try {
      const user = await User.findOne({
        where: { phone_number: phoneNumber }
      });

      if (!user) {
        throw new Error('User not found.');
      }

      if (user.phone_verification_code !== code) {
        throw new Error('Invalid reset code.');
      }

      if (TokenService.isTokenExpired(user.phone_verification_expires)) {
        throw new Error('Reset code has expired.');
      }

      // Hash new password
      const saltRounds = 12;
      const password_hash = await bcrypt.hash(newPassword, saltRounds);

      // Update password and clear reset code
      await user.update({
        password_hash,
        phone_verification_code: null,
        phone_verification_expires: null
      });

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Validate password strength
  static validatePassword(newPassword) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?/+":{}|<>]/.test(newPassword);
    if (newPassword.length < minLength) {
      throw new Error(`Password must be at least ${minLength} characters long.`);
    }

    if (!hasUpperCase) {
      throw new Error('Password must contain at least one uppercase letter.');
    }

    if (!hasLowerCase) {
      throw new Error('Password must contain at least one lowercase letter.');
    }

    if (!hasNumbers) {
      throw new Error('Password must contain at least one number.');
    }

    if (!hasSpecialChar) {
      throw new Error('Password must contain at least one special character.');
    }

    return true;
  }
}

module.exports = PasswordResetService;