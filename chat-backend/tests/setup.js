const { sequelize } = require('../models');

const modelOrder = [
  'Report',
  'UserViolation',
  'UserBlock',
  'ReadReceipt',
  'Attachment',
  'Message',
  'ChannelMember',
  'Channel',
  'User'
];

beforeAll(async () => {
  console.log('✅ Test DB ready (migrations should be run manually before tests)');
});

afterEach(async () => {
  for (const modelName of modelOrder) {
    await sequelize.models[modelName].truncate({ cascade: true });
  }
});

afterAll(async () => {
  await sequelize.close();
});
