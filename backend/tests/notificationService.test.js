const assert = require("assert");
const path = require("path");

const modelsPath = require.resolve(path.join(__dirname, "../models"));
const fcmServicePath = require.resolve(
  path.join(__dirname, "../services/fcmService")
);
const websocketServicePath = require.resolve(
  path.join(__dirname, "../services/websocketService")
);
const emailServicePath = require.resolve(
  path.join(__dirname, "../services/emailService")
);
const smsServicePath = require.resolve(
  path.join(__dirname, "../services/smsService")
);

let lastPayload = null;

const mockNotification = {
  create: async (payload) => {
    lastPayload = payload;
    return { id: 1, ...payload };
  },
  bulkCreate: async (rows) => rows.map((row, idx) => ({ id: idx + 1, ...row })),
};

const mockUser = {
  findByPk: async (id) => ({
    id,
    phone_number: null,
    sms_notifications: false,
  }),
};

require.cache[modelsPath] = {
  exports: {
    Notification: mockNotification,
    User: mockUser,
  },
};

require.cache[fcmServicePath] = {
  exports: {
    sendToUserByPlatform: async () => ({ successCount: 0, failureCount: 0 }),
    sendToMultipleUsers: async () => ({ successCount: 0, failureCount: 0 }),
  },
};

require.cache[websocketServicePath] = {
  exports: {
    sendToUser: () => {},
  },
};

require.cache[emailServicePath] = {
  exports: {
    EmailService: {
      sendEmail: async () => {},
    },
  },
};

require.cache[smsServicePath] = {
  exports: {
    sendSMS: async () => {},
  },
};

const NotificationService = require("../services/notificationService");

(async () => {
  const Transaction = { name: "Transaction" };
  await NotificationService.createNotification({
    userId: 1,
    title: "Transaction Update",
    message: "Transaction posted.",
    type: "wallet_update",
    relatedEntity: { model: Transaction, id: 42 },
  });
  assert.strictEqual(lastPayload.related_entity_type, "Transaction");
  assert.strictEqual(lastPayload.related_entity_id, 42);

  const PaymentRecord = { name: "PaymentRecord" };
  await NotificationService.createNotification({
    userId: 2,
    title: "Payment Update",
    message: "Payment recorded.",
    type: "wallet_update",
    relatedEntity: { model: PaymentRecord, id: 7 },
  });
  assert.strictEqual(lastPayload.related_entity_type, "PaymentRecord");
  assert.strictEqual(lastPayload.related_entity_id, 7);

  await NotificationService.createNotification({
    userId: 3,
    title: "General",
    message: "No related entity.",
    type: "info",
  });
  assert.strictEqual(lastPayload.related_entity_type, null);
  assert.strictEqual(lastPayload.related_entity_id, null);
})();
