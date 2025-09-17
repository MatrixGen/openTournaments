const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
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
    const html = `
      <h2>Tournament Invitation</h2>
      <p>You have been invited to join the tournament <strong>${tournamentName}</strong>.</p>
      <p><a href="${process.env.FRONTEND_URL}/tournaments/${tournamentId}">Click here to view the tournament</a></p>
    `;

    return this.sendEmail(email, subject, text, html);
  }

  async sendMatchNotification(email, opponentName, tournamentName, matchId) {
    const subject = `New Match Scheduled: ${tournamentName}`;
    const text = `You have a new match against ${opponentName} in the tournament "${tournamentName}".\n\nView match: ${process.env.FRONTEND_URL}/matches/${matchId}`;
    const html = `
      <h2>New Match Scheduled</h2>
      <p>You have a new match against <strong>${opponentName}</strong> in the tournament <strong>${tournamentName}</strong>.</p>
      <p><a href="${process.env.FRONTEND_URL}/matches/${matchId}">Click here to view the match</a></p>
    `;

    return this.sendEmail(email, subject, text, html);
  }

  async sendScoreConfirmationRequest(email, opponentName, tournamentName, matchId) {
    const subject = `Score Reported - Please Confirm`;
    const text = `${opponentName} has reported a score for your match in "${tournamentName}".\n\nPlease confirm or dispute the result: ${process.env.FRONTEND_URL}/matches/${matchId}`;
    const html = `
      <h2>Score Reported</h2>
      <p><strong>${opponentName}</strong> has reported a score for your match in <strong>${tournamentName}</strong>.</p>
      <p><a href="${process.env.FRONTEND_URL}/matches/${matchId}">Click here to confirm or dispute the result</a></p>
    `;

    return this.sendEmail(email, subject, text, html);
  }

  async sendTournamentCompletionNotification(email, tournamentName, position, prizeAmount) {
    const subject = `Tournament Completed: ${tournamentName}`;
    const text = `The tournament "${tournamentName}" has completed.\n\nYou finished in ${position} place${prizeAmount ? ` and won ${prizeAmount}` : ''}.`;
    const html = `
      <h2>Tournament Completed</h2>
      <p>The tournament <strong>${tournamentName}</strong> has completed.</p>
      <p>You finished in <strong>${position}</strong> place${prizeAmount ? ` and won <strong>${prizeAmount}</strong>` : ''}.</p>
    `;

    return this.sendEmail(email, subject, text, html);
  }
}

module.exports = new EmailService();