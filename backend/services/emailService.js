const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'Gmail',
      port:587,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  buildTemplate(title, message, actionUrl, actionText = "View", footerText = "Good luck in your matches!") {
    return `
    <div style="background-color:#0d0d0d; color:#f0f0f0; font-family: Arial, sans-serif; padding:20px; text-align:center;">
      <div style="max-width:600px; margin:auto; background:#1a1a1a; border-radius:12px; overflow:hidden; box-shadow:0 0 20px rgba(0,255,150,0.5);">
        <div style="background:#111; padding:20px; border-bottom:2px solid #00ff99;">
          <h1 style="color:#00ff99; margin:0; font-size:24px; text-shadow:0 0 10px #00ff99;">🎮 ${title}</h1>
        </div>
        <div style="padding:20px; font-size:16px; line-height:1.6; color:#ccc;">
          ${message}
          ${actionUrl ? `
          <div style="margin:25px 0;">
            <a href="${actionUrl}" style="background:#00ff99; color:#111; padding:12px 20px; text-decoration:none; border-radius:8px; font-weight:bold; display:inline-block; box-shadow:0 0 12px #00ff99;">
              ${actionText} ⚡
            </a>
          </div>` : ""}
        </div>
        <div style="background:#111; padding:15px; font-size:12px; color:#666;">
          ${footerText}
        </div>
      </div>
    </div>
    `;
  }

  async sendEmail(to, subject, text, html = null) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject,
        text,
        html: html || text
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result);
      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendTournamentInvitation(email, tournamentName, tournamentId) {
    const subject = `Invitation to Tournament: ${tournamentName}`;
    const text = `You have been invited to join the tournament "${tournamentName}".\n\nJoin here: ${process.env.FRONTEND_URL}/tournaments/${tournamentId}`;
    const html = this.buildTemplate(
      "Tournament Invitation",
      `<p>You have been invited to join the tournament <strong>${tournamentName}</strong>.</p>`,
      `${process.env.FRONTEND_URL}/tournaments/${tournamentId}`,
      "Join Tournament"
    );

    return this.sendEmail(email, subject, text, html);
  }

  async sendMatchNotification(email, opponentName, tournamentName, matchId) {
    const subject = `New Match Scheduled: ${tournamentName}`;
    const text = `You have a new match against ${opponentName} in the tournament "${tournamentName}".\n\nView match: ${process.env.FRONTEND_URL}/matches/${matchId}`;
    const html = this.buildTemplate(
      "New Match Scheduled",
      `<p>You have a new match against <strong>${opponentName}</strong> in the tournament <strong>${tournamentName}</strong>.</p>`,
      `${process.env.FRONTEND_URL}/matches/${matchId}`,
      "View Match"
    );

    return this.sendEmail(email, subject, text, html);
  }

  async sendScoreConfirmationRequest(email, opponentName, tournamentName, matchId) {
    const subject = `Score Reported - Please Confirm`;
    const text = `${opponentName} has reported a score for your match in "${tournamentName}".\n\nPlease confirm or dispute the result: ${process.env.FRONTEND_URL}/matches/${matchId}`;
    const html = this.buildTemplate(
      "Score Reported",
      `<p><strong>${opponentName}</strong> has reported a score for your match in <strong>${tournamentName}</strong>.</p>`,
      `${process.env.FRONTEND_URL}/matches/${matchId}`,
      "Confirm / Dispute"
    );

    return this.sendEmail(email, subject, text, html);
  }

  async sendTournamentCompletionNotification(email, tournamentName, position, prizeAmount) {
    const subject = `Tournament Completed: ${tournamentName}`;
    const text = `The tournament "${tournamentName}" has completed.\n\nYou finished in ${position} place${prizeAmount ? ` and won ${prizeAmount}` : ''}.`;
    const html = this.buildTemplate(
      "Tournament Completed",
      `<p>The tournament <strong>${tournamentName}</strong> has completed.</p>
       <p>You finished in <strong>${position}</strong> place${prizeAmount ? ` and won <strong>${prizeAmount}</strong>` : ''}.</p>`,
      null,
      ""
    );

    return this.sendEmail(email, subject, text, html);
  }
}

module.exports = new EmailService();
