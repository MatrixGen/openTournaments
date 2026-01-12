"use strict";

const admin = require("../config/fireBaseConfig"); // Assuming the initialization code you sent is in firebaseConfig.js
const { DeviceToken } = require("../models"); // Adjust path to your models index

class FCMService {
  /**
   * Send notification to a single user (across all their devices)
   */
  async sendToUser(userId, { title, body, data = {} }) {
    const tokens = await this._getUserTokens([userId]);
    if (tokens.length === 0)
      return { success: false, message: "No device tokens found" };

    return this._sendNotification(tokens, title, body, data);
  }

  /**
   * Send notification to multiple users
   */
  async sendToMultipleUsers(userIds, { title, body, data = {} }) {
    const tokens = await this._getUserTokens(userIds);
    if (tokens.length === 0)
      return { success: false, message: "No device tokens found" };

    return this._sendNotification(tokens, title, body, data);
  }

  /**
   * Internal helper to fetch tokens from DB
   */
  async _getUserTokens(userIds) {
    const records = await DeviceToken.findAll({
      where: { user_id: userIds },
      attributes: ["token"],
    });
    return records.map((r) => r.token);
  }

  /**
   * Core logic to interact with Firebase
   */
async _sendNotification(tokens, title, body, data) {
  console.log(`[DEBUG] Preparing to send to tokens:`, tokens);

  const message = {
    notification: { title, body },
    data: data,
    tokens: tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Log the detailed response from Firebase for each token
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error(`[DEBUG] Token at index ${idx} failed with error:`, resp.error.code);
      }
    });

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error) {
    console.error('[DEBUG] Firebase Admin SDK Error:', error.code, error.message);
    throw error;
  }
}
}

module.exports = new FCMService();
