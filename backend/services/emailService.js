const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailTemplateManager {
  constructor(brandConfig) {
    this.brandConfig = brandConfig;
    this.templateCache = new Map();
  }

  async getTemplate(templateName, variables = {}) {
    try {
      if (!this.templateCache.has(templateName)) {
        const templatePath = path.join(__dirname, 'email-templates', `${templateName}.html`);
        const templateContent = await fs.readFile(templatePath, 'utf8');
        this.templateCache.set(templateName, templateContent);
      }

      let template = this.templateCache.get(templateName);
      return this.replaceTemplateVariables(template, variables);
    } catch (error) {
      console.warn(`Template ${templateName} not found, using fallback`);
      return this.buildFallbackTemplate(variables);
    }
  }

  replaceTemplateVariables(template, variables) {
    return template.replace(/{{(\w+)}}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }

  buildFallbackTemplate(variables) {
    const {
      title = 'Notification',
      content = '',
      actionUrl = '',
      actionText = 'Take Action',
      footerText = ''
    } = variables;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>${this.getCommonStyles()}</style>
</head>
<body>
    ${this.buildEmailHeader()}
    ${this.buildEmailContent(title, content, actionUrl, actionText, footerText)}
    ${this.buildEmailFooter()}
</body>
</html>`;
  }

  getCommonStyles() {
    return `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            background: ${this.brandConfig.colors.background}; 
            color: ${this.brandConfig.colors.text};
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
        }
        .email-container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: ${this.brandConfig.colors.surface};
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .header { 
            background: linear(135deg, ${this.brandConfig.colors.primary}20, ${this.brandConfig.colors.secondary}20);
            padding: 30px 20px;
            text-align: center;
            border-bottom: 3px solid ${this.brandConfig.colors.primary};
        }
        .logo { 
            font-size: 28px; 
            font-weight: bold; 
            color: ${this.brandConfig.colors.primary};
            text-shadow: 0 0 20px ${this.brandConfig.colors.primary}80;
            margin-bottom: 10px;
        }
        .content { 
            padding: 40px 30px; 
        }
        .title { 
            font-size: 24px; 
            color: ${this.brandConfig.colors.primary};
            margin-bottom: 20px;
            text-align: center;
        }
        .message { 
            font-size: 16px; 
            color: ${this.brandConfig.colors.text};
            margin-bottom: 30px;
        }
        .action-button {
            display: inline-block;
            background: linear(135deg, ${this.brandConfig.colors.primary}, ${this.brandConfig.colors.secondary});
            color: white;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            text-align: center;
            margin: 20px 0;
            box-shadow: 0 4px 15px ${this.brandConfig.colors.primary}40;
            transition: all 0.3s ease;
        }
        .action-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px ${this.brandConfig.colors.primary}60;
        }
        .footer { 
            background: #111;
            padding: 30px;
            text-align: center;
            color: ${this.brandConfig.colors.textMuted};
            font-size: 14px;
        }
        .social-links { 
            margin: 20px 0; 
        }
        .social-links a { 
            margin: 0 10px; 
            color: ${this.brandConfig.colors.primary};
            text-decoration: none;
        }
        .signature { 
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #333;
        }
        .unsubscribe {
            margin-top: 15px;
            font-size: 12px;
            color: #666;
        }
    `;
  }

  buildEmailHeader() {
    return `
    <div class="email-container">
        <div class="header">
            <div class="logo">🎮 ${this.brandConfig.company.name}</div>
            <div style="color: ${this.brandConfig.colors.textMuted}; font-size: 14px;">
                Competitive Gaming Platform
            </div>
        </div>`;
  }

  buildEmailContent(title, content, actionUrl, actionText, footerText) {
    return `
        <div class="content">
            <h1 class="title">${title}</h1>
            <div class="message">${content}</div>
            ${actionUrl ? this.buildActionButton(actionUrl, actionText) : ''}
            ${footerText ? this.buildFooterNote(footerText) : ''}
        </div>`;
  }

  buildActionButton(actionUrl, actionText) {
    return `
            <div style="text-align: center;">
                <a href="${actionUrl}" class="action-button">${actionText} 🚀</a>
            </div>`;
  }

  buildFooterNote(footerText) {
    return `
            <div style="margin-top: 30px; padding: 15px; background: #111; border-radius: 8px; font-size: 14px;">
                ${footerText}
            </div>`;
  }

  buildEmailFooter() {
    return `
        <div class="footer">
            <div class="social-links">
                <a href="${this.brandConfig.company.website}">Website</a> • 
                <a href="https://discord.gg/example">Discord</a> • 
                <a href="https://twitter.com/example">Twitter</a>
            </div>
            
            <div style="margin: 15px 0;">
                <strong>${this.brandConfig.company.name}</strong><br>
                ${this.brandConfig.company.address}<br>
                Phone: ${this.brandConfig.company.phone}
            </div>
            
            <div class="signature">
                <strong>Happy Gaming! 🎯</strong><br>
                The ${this.brandConfig.company.name} Team
            </div>
            
            <div class="unsubscribe">
                <a href="{{unsubscribe_url}}" style="color: #666; text-decoration: none;">
                    Unsubscribe from these notifications
                </a>
            </div>
        </div>
    </div>`;
  }
}

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
    this.brandConfig = this.getBrandConfig();
    this.templateManager = new EmailTemplateManager(this.brandConfig);
  }

  createTransporter() {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_PORT == 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
        logger: true,
        debug: true,
    });
  }

  getBrandConfig() {
    return {
      company: {
        name: process.env.COMPANY_NAME || 'openTournament',
        address: process.env.COMPANY_ADDRESS || '123 Gaming Street, Digital City',
        website: process.env.COMPANY_WEBSITE || 'https://opentournament.com',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@opentournament.com',
        phone: process.env.COMPANY_PHONE || '+1 (555) 123-4567'
      },
      colors: {
        primary: '#00ff99',
        secondary: '#6b46c1',
        background: '#0d0d0d',
        surface: '#1a1a1a',
        text: '#f0f0f0',
        textMuted: '#a0a0a0'
      }
    };
  }

  async sendEmail(to, subject, text, html = null, options = {}) {
    try {
      const from = options.from || `${this.brandConfig.company.name} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`;
      
      const mailOptions = {
        from,
        to,
        subject,
        text,
        html,
        replyTo: options.replyTo || this.brandConfig.company.supportEmail,
        ...options
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${to}: ${subject}`);
      return result;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw error;
    }
  }

  async sendTemplatedEmail(to, subject, text, templateName, templateVariables = {}, options = {}) {
    const html = await this.templateManager.getTemplate(templateName, {
      ...templateVariables,
      title: subject,
      content: text
    });

    return this.sendEmail(to, subject, text, html, options);
  }
}

// Specific email service classes for better organization
class UserEmailService extends EmailService {
  async sendWelcomeEmail(user) {
    const subject = `Welcome to ${this.brandConfig.company.name}! Get Ready to Compete 🎮`;
    const text = `Welcome ${user.username}! Thank you for joining ${this.brandConfig.company.name}. Start exploring tournaments and challenge players worldwide.`;
    
    const templateVariables = {
      username: user.username,
      content: `
        <p>Hey <strong>${user.username}</strong>!</p>
        <p>Welcome to ${this.brandConfig.company.name} - your new home for competitive gaming tournaments.</p>
        <p>We're excited to have you on board! Here's what you can do now:</p>
        <ul style="margin: 20px 0; padding-left: 20px;">
            <li>Join existing tournaments</li>
            <li>Create your own tournaments</li>
            <li>Challenge players worldwide</li>
            <li>Track your rankings and stats</li>
            <li>Win amazing prizes</li>
        </ul>
        <p>Ready to make your mark in the gaming world?</p>
      `,
      actionUrl: `${process.env.FRONTEND_URL}/tournaments`,
      actionText: 'Explore Tournaments',
      footerText: 'Need help getting started? Check out our <a href="' + process.env.FRONTEND_URL + '/help" style="color: #00ff99;">Getting Started Guide</a>.'
    };

    return this.sendTemplatedEmail(user.email, subject, text, 'welcome', templateVariables);
  }

  async sendPasswordReset(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = `🔒 Password Reset Request`;
    const text = `You requested to reset your password. Use this link: ${resetUrl}`;
    
    const templateVariables = {
      username: user.username,
      content: `
        <p>We received a request to reset your password for your ${this.brandConfig.company.name} account.</p>
        <p>If you didn't make this request, you can safely ignore this email.</p>
        <p>Otherwise, click the button below to create a new password:</p>
      `,
      actionUrl: resetUrl,
      actionText: 'Reset Password',
      footerText: 'This password reset link will expire in 1 hour for security reasons.'
    };

    return this.sendTemplatedEmail(user.email, subject, text, 'password-reset', templateVariables);
  }

  async sendVerificationEmail(user, verificationToken) {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const subject = `✅ Verify Your Email Address`;
    const text = `Please verify your email address to complete your registration: ${verifyUrl}`;
    
    const templateVariables = {
      username: user.username,
      content: `
        <p>Welcome to ${this.brandConfig.company.name}! We're excited to have you on board.</p>
        <p>To complete your registration and start competing, please verify your email address by clicking the button below:</p>
      `,
      actionUrl: verifyUrl,
      actionText: 'Verify Email',
      footerText: 'This verification link will expire in 24 hours.'
    };

    return this.sendTemplatedEmail(user.email, subject, text, 'email-verification', templateVariables);
  }
}

class TournamentEmailService extends EmailService {
  async sendTournamentInvitation(user, tournament, inviter) {
    const subject = `🎯 Tournament Invitation: ${tournament.name}`;
    const text = `You've been invited by ${inviter.username} to join "${tournament.name}". Join now to compete for the prize pool!`;
    
    const templateVariables = {
      username: user.username,
      tournamentName: tournament.name,
      tournamentFormat: tournament.format,
      prizePool: tournament.prize_pool || 'Glory and Bragging Rights',
      inviterName: inviter.username,
      content: `
        <p>You've received an exclusive invitation from <strong>${inviter.username}</strong> to join the tournament:</p>
        <div style="background: #111; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #00ff99; margin-bottom: 10px;">${tournament.name}</h3>
            <p><strong>Format:</strong> ${tournament.format}</p>
            <p><strong>Prize Pool:</strong> ${tournament.prize_pool || 'Glory and Bragging Rights'}</p>
            ${tournament.description ? `<p><strong>Description:</strong> ${tournament.description}</p>` : ''}
        </div>
        <p>Don't miss this opportunity to showcase your skills and compete against top players!</p>
      `,
      actionUrl: `${process.env.FRONTEND_URL}/tournaments/${tournament.id}`,
      actionText: 'Join Tournament',
      footerText: `This invitation expires in 48 hours. Tournament starts on ${new Date(tournament.start_date).toLocaleDateString()}.`
    };

    return this.sendTemplatedEmail(user.email, subject, text, 'tournament-invitation', templateVariables);
  }

  async sendTournamentResult(user, tournament, position, prize) {
    const subject = `🏆 Tournament Completed: ${tournament.name}`;
    const text = `The tournament "${tournament.name}" has finished. You placed ${this.getPositionText(position)}!`;
    
    const templateVariables = {
      username: user.username,
      tournamentName: tournament.name,
      position: this.getPositionText(position),
      prize: prize,
      content: `
        <p>Congratulations on completing <strong>${tournament.name}</strong>!</p>
        <div style="background: #111; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <div style="font-size: 18px; margin-bottom: 10px;">Your Final Ranking</div>
            <div style="font-size: 32px; font-weight: bold; color: #00ff99;">${this.getPositionText(position)}</div>
            ${prize ? `
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #333;">
                <div style="font-size: 14px; color: #a0a0a0;">Prize Won</div>
                <div style="font-size: 20px; font-weight: bold; color: #ffd700;">${prize}</div>
            </div>
            ` : ''}
        </div>
        <p>Thank you for participating and showcasing your skills in the arena!</p>
      `,
      actionUrl: `${process.env.FRONTEND_URL}/tournaments/${tournament.id}/results`,
      actionText: 'View Full Results',
      footerText: 'Prizes will be distributed within 3-5 business days. Keep an eye on your account!'
    };

    return this.sendTemplatedEmail(user.email, subject, text, 'tournament-result', templateVariables);
  }

  getPositionText(position) {
    const positions = {
      1: '1st Place 🥇',
      2: '2nd Place 🥈', 
      3: '3rd Place 🥉'
    };
    return positions[position] || `${position}th Place`;
  }
}

class MatchEmailService extends EmailService {
  async sendMatchScheduled(user, match, opponent, tournament) {
    const subject = `⚔️ Match Scheduled: ${tournament.name}`;
    const text = `Your match against ${opponent.username} in "${tournament.name}" has been scheduled. Get ready to compete!`;
    
    const templateVariables = {
      username: user.username,
      opponentName: opponent.username,
      tournamentName: tournament.name,
      matchTime: new Date(match.scheduled_time).toLocaleString(),
      content: `
        <p>Your next challenge awaits! A match has been scheduled in <strong>${tournament.name}</strong>.</p>
        <div style="background: #111; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <div style="display: inline-block; margin: 0 20px;">
                <div style="font-size: 18px; font-weight: bold;">${user.username}</div>
                <div style="font-size: 12px; color: #a0a0a0;">YOU</div>
            </div>
            <div style="display: inline-block; font-size: 24px; color: #00ff99; margin: 0 15px;">VS</div>
            <div style="display: inline-block; margin: 0 20px;">
                <div style="font-size: 18px; font-weight: bold;">${opponent.username}</div>
                <div style="font-size: 12px; color: #a0a0a0;">OPPONENT</div>
            </div>
        </div>
        <p><strong>📅 Scheduled Time:</strong> ${new Date(match.scheduled_time).toLocaleString()}</p>
        <p>Make sure you're available and prepared for this exciting match!</p>
      `,
      actionUrl: `${process.env.FRONTEND_URL}/matches/${match.id}`,
      actionText: 'View Match Details',
      footerText: 'Need to reschedule? Contact your opponent directly through the platform.'
    };

    return this.sendTemplatedEmail(user.email, subject, text, 'match-scheduled', templateVariables);
  }

  async sendScoreConfirmationRequest(user, match, opponent, reportedScore) {
    const subject = `📊 Score Reported - Action Required`;
    const text = `${opponent.username} has reported a score for your match. Please confirm or dispute the result.`;
    
    const templateVariables = {
      username: user.username,
      opponentName: opponent.username,
      reportedScore: reportedScore,
      content: `
        <p>Your opponent <strong>${opponent.username}</strong> has reported the following score for your recent match:</p>
        <div style="background: #111; padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <div style="font-size: 24px; font-weight: bold; color: #00ff99;">${reportedScore}</div>
            <div style="font-size: 14px; color: #a0a0a0; margin-top: 10px;">Reported by ${opponent.username}</div>
        </div>
        <p>Please review this score and confirm if it's accurate. If there's any discrepancy, you can dispute the result.</p>
        <p><strong>Time to respond:</strong> You have 24 hours to confirm or dispute this score.</p>
      `,
      actionUrl: `${process.env.FRONTEND_URL}/matches/${match.id}`,
      actionText: 'Confirm / Dispute Score',
      footerText: 'If you don\'t respond within 24 hours, the reported score will be automatically accepted.'
    };

    return this.sendTemplatedEmail(user.email, subject, text, 'score-confirmation', templateVariables);
  }
}

// Export specialized services
module.exports = {
  EmailService,
  UserEmailService: new UserEmailService(),
  TournamentEmailService: new TournamentEmailService(), 
  MatchEmailService: new MatchEmailService()
};