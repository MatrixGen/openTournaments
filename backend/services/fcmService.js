"use strict";

const admin = require("../config/fireBaseConfig");
const { DeviceToken } = require("../models");

class FCMService {

  /* ===============================
     PUBLIC METHODS
     =============================== */

  async sendToUserByPlatform(userId, platform, payload) {
    const tokens = await this._getUserTokensByPlatform(userId, platform);

    if (!tokens.length) {
      return {
        success: false,
        message: `No ${platform} device tokens found`,
      };
    }

    return this._sendMulticast(tokens, payload);
  }

  async sendToMultipleUsers(userIds, payload) {
    const tokens = await this._getUserTokens(userIds);

    if (!tokens.length) {
      return {
        success: false,
        message: "No device tokens found",
      };
    }

    return this._sendMulticast(tokens, payload);
  }

  /* ===============================
     TOKEN HELPERS
     =============================== */

  async _getUserTokensByPlatform(userId, platform) {
    const records = await DeviceToken.findAll({
      where: { user_id: userId, platform },
      attributes: ["token"],
    });

    return records.map(r => r.token);
  }

  async _getUserTokens(userIds) {
    const records = await DeviceToken.findAll({
      where: { user_id: userIds },
      attributes: ["token"],
    });

    return records.map(r => r.token);
  }

  /* ===============================
     CORE FIREBASE SENDER
     =============================== */

  async _sendMulticast(tokens, payload) {
    console.log("[FCM] Sending to tokens:", tokens.length);

    const message = {
      tokens,
      ...payload, // notification, data, android, webpush, etc
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    const invalidTokens = [];

    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error?.code;
        console.error(`[FCM] Token ${idx} failed:`, code);

        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });

    if (invalidTokens.length) {
      await DeviceToken.destroy({
        where: { token: invalidTokens },
      });

      console.log(`[FCM] Removed ${invalidTokens.length} invalid tokens`);
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  }
}

module.exports = new FCMService();
