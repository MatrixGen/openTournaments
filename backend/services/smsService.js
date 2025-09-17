const AfricasTalking = require('africastalking');

class SMSService {
  constructor() {
    this.africasTalking = AfricasTalking({
      apiKey: process.env.AFRICAS_TALKING_API_KEY,
      username: process.env.AFRICAS_TALKING_USERNAME
    });
    
    this.sms = this.africasTalking.SMS;
  }

  async sendSMS(phoneNumber, message) {
    try {
      // Ensure phone number is in international format
      let formattedPhone = phoneNumber;
      if (!phoneNumber.startsWith('+')) {
        // Assuming Tanzanian numbers by default
        if (phoneNumber.startsWith('0')) {
          formattedPhone = '+255' + phoneNumber.substring(1);
        } else {
          formattedPhone = '+255' + phoneNumber;
        }
      }

      const options = {
        to: [formattedPhone],
        message: message
      };

      const result = await this.sms.send(options);
      console.log('SMS sent successfully:', result);
      return result;
    } catch (error) {
      console.error('Error sending SMS:', error);
      throw error;
    }
  }

  async sendTournamentInvitationSMS(phoneNumber, tournamentName) {
    const message = `You've been invited to join ${tournamentName} tournament on ${process.env.APP_NAME}. Visit ${process.env.FRONTEND_URL} to join.`;
    return this.sendSMS(phoneNumber, message);
  }

  async sendMatchNotificationSMS(phoneNumber, opponentName, tournamentName) {
    const message = `You have a new match vs ${opponentName} in ${tournamentName} tournament on ${process.env.APP_NAME}.`;
    return this.sendSMS(phoneNumber, message);
  }

  async sendScoreConfirmationSMS(phoneNumber, opponentName) {
    const message = `${opponentName} has reported a score. Please confirm or dispute on ${process.env.APP_NAME}.`;
    return this.sendSMS(phoneNumber, message);
  }
}

module.exports = new SMSService();