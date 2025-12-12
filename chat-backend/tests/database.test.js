const { sequelize, User, Channel, Message, ChannelMember } = require('../models');

describe('Database Setup', () => {
  beforeAll(async () => {
    // Connect and reset DB before running tests
    await sequelize.authenticate();
    //await sequelize.sync({ force: true }); // drop + recreate tables
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('should connect to database successfully', async () => {
    await expect(sequelize.authenticate()).resolves.not.toThrow();
  });

  it('should have all models defined', () => {
    expect(User).toBeDefined();
    expect(Channel).toBeDefined();
    expect(Message).toBeDefined();
    expect(ChannelMember).toBeDefined();
    expect(require('../models/readreceipt')).toBeDefined();
    expect(require('../models/attachment')).toBeDefined();
  });

  it('should sync all models without errors', async () => {
    await expect(sequelize.sync({ force: false })).resolves.not.toThrow();
  });

  it('should create a user successfully', async () => {
    const user = await User.create({
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hashedpassword123',
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe('test@example.com');
    expect(user.username).toBe('testuser');
  });
});
