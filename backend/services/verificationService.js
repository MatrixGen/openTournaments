const { User } = require('../models');
const TokenService = require('./tokenService');
const EmailService = require('./emailService');
const SMSService = require('./smsService');

class VerificationService {
  // Send email verification
  static async sendEmailVerification(user) {
    try {
      // Generate verification token
      const verificationToken = TokenService.generateToken();
      const expirationTime = TokenService.getExpirationTime(24); // 24 hours

      // Save token to user
      await user.update({
        verification_token: verificationToken,
        verification_token_expires: expirationTime
      });

      // Send verification email
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      
      await EmailService.sendEmail(
        user.email,
        'Verify Your Email Address',
        `Please verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.`,
        `
          <h2>Verify Your Email Address</h2>
          <p>Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create an account, please ignore this email.</p>
        `
      );

      return true;
    } catch (error) {
      console.error('Error sending email verification:', error);
      throw error;
    }
  }

  // Send phone verification
  static async sendPhoneVerification(user) {
    try {
      // Generate verification code
      const verificationCode = TokenService.generateVerificationCode();
      const expirationTime = TokenService.getExpirationTime(0.5); // 30 minutes

      // Save code to user
      await user.update({
        phone_verification_code: verificationCode,
        phone_verification_expires: expirationTime
      });

      // Send SMS verification
      await SMSService.sendSMS(
        user.phone_number,
        `Your verification code is: ${verificationCode}. This code will expire in 30 minutes.`
      );

      return true;
    } catch (error) {
      console.error('Error sending phone verification:', error);
      throw error;
    }
  }

  // Verify email with token
  static async verifyEmail(token) {
    try {
      const user = await User.findOne({
        where: { verification_token: token }
      });

      if (!user) {
        throw new Error('Invalid verification token.');
      }

      if (TokenService.isTokenExpired(user.verification_token_expires)) {
        throw new Error('Verification token has expired.');
      }

      // Mark email as verified and clear token
      await user.update({
        email_verified: true,
        verification_token: null,
        verification_token_expires: null
      });

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Verify phone with code
  static async verifyPhone(code, userId) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found.');
      }

      if (user.phone_verification_code !== code) {
        throw new Error('Invalid verification code.');
      }

      if (TokenService.isTokenExpired(user.phone_verification_expires)) {
        throw new Error('Verification code has expired.');
      }

      // Mark phone as verified and clear code
      await user.update({
        phone_verified: true,
        phone_verification_code: null,
        phone_verification_expires: null
      });

      return user;
    } catch (error) {
      throw error;
    }
  }

  // Resend email verification
  static async resendEmailVerification(email) {
    try {
      const user = await User.findOne({ where: { email } });

      if (!user) {
        throw new Error('User not found.');
      }

      if (user.email_verified) {
        throw new Error('Email is already verified.');
      }

      await this.sendEmailVerification(user);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // Resend phone verification
  static async resendPhoneVerification(userId) {
    try {
      const user = await User.findByPk(userId);

      if (!user) {
        throw new Error('User not found.');
      }

      if (!user.phone_number) {
        throw new Error('Phone number not found.');
      }

      if (user.phone_verified) {
        throw new Error('Phone is already verified.');
      }

      await this.sendPhoneVerification(user);
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = VerificationService;