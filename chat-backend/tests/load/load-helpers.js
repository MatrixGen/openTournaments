// Helper functions for load testing
module.exports = {
  // Generate random string for usernames/emails
  randomString: (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  },

  // Random message content
  randomMessage: () => {
    const messages = [
      "Hello everyone!",
      "How's it going?",
      "This is a test message",
      "Testing the chat system",
      "Load testing in progress",
      "Message for performance testing",
      "Chat platform working well",
      "Real-time messaging test",
      "WebSocket connection test",
      "API performance check"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
};