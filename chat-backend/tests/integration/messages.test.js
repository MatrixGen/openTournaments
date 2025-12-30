const request = require('supertest');
const app = require('../../src/app');
const { User, Channel, ChannelMember, Message } = require('../../models');
const { testUsers, createTestUser } = require('../fixtures/users');

describe('Messages API', () => {
  let user1, user2, channel, authToken;

  beforeEach(async () => {
    // Create test users
    user1 = await createTestUser(User, testUsers.regularUser);
    user2 = await createTestUser(User, testUsers.secondUser);

    // Create a channel
    channel = await Channel.create({
      name: 'Test Channel',
      type: 'group',
      createdBy: user1.id
    });

    // Add users to channel
    await ChannelMember.bulkCreate([
      { channelId: channel.id, userId: user1.id, role: 'admin' },
      { channelId: channel.id, userId: user2.id, role: 'member' }
    ]);

    // Generate auth token for user1
    const { generateAccessToken } = require('../../src/utils/tokens');
    authToken = generateAccessToken(user1);
  });

  describe('GET /api/v1/messages/:channelId/messages', () => {
    beforeEach(async () => {
      // Create test messages
      await Message.bulkCreate([
        {
          content: 'First message',
          channelId: channel.id,
          userId: user1.id,
          type: 'text'
        },
        {
          content: 'Second message',
          channelId: channel.id,
          userId: user2.id,
          type: 'text'
        }
      ]);
    });

    it('should retrieve channel messages', async () => {
      const response = await request(app)
        .get(`/api/v1/messages/${channel.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.messages).toHaveLength(2);
      expect(response.body.data.messages[0].content).toBe('First message');
      expect(response.body.data.messages[1].content).toBe('Second message');
    });

    it('should reject if user is not channel member', async () => {
      // Create another user not in channel
      const otherUser = await createTestUser(User, {
        email: 'other@example.com',
        password: 'password123',
        username: 'otheruser'
      });
      
      const { generateAccessToken } = require('../../src/utils/tokens');
      const otherUserToken = generateAccessToken(otherUser);

      const response = await request(app)
        .get(`/api/v1/messages/${channel.id}/messages`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/v1/messages/:channelId/messages', () => {
    it('should send a message to channel', async () => {
      const messageContent = 'Hello, world!';
      
      const response = await request(app)
        .post(`/api/v1/messages/${channel.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: messageContent })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message.content).toBe(messageContent);
      expect(response.body.data.message.user.id).toBe(user1.id);

      // Verify message was saved in database
      const messages = await Message.findAll({ where: { channelId: channel.id } });
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe(messageContent);
    });

    it('should filter profanity in messages', async () => {
      const profaneContent = 'This is a damn test message';
      
      const response = await request(app)
        .post(`/api/v1/messages/${channel.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: profaneContent })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.moderation.wasFiltered).toBe(true);
      expect(response.body.data.message.content).not.toBe(profaneContent);
    });
  });

  describe('POST /api/v1/channels/:channelId/messages/read', () => {
    let message;

    beforeEach(async () => {
      message = await Message.create({
        content: 'Test message',
        channelId: channel.id,
        userId: user2.id, // Different user sends message
        type: 'text'
      });
    });

    it('should mark messages as read', async () => {
      const response = await request(app)
        .post(`/api/v1/messages/${channel.id}/messages/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ messageIds: [message.id] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.readReceipts).toHaveLength(1);
    });
  });
});