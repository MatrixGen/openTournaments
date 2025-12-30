const request = require('supertest');
const app = require('../../src/app');
const { User, Channel, ChannelMember } = require('../../models');
const { testUsers, createTestUser } = require('../fixtures/users');

describe('Channels API', () => {
  let user1, user2, authToken;

  beforeEach(async () => {
    user1 = await createTestUser(User, testUsers.regularUser);
    user2 = await createTestUser(User, testUsers.secondUser);

    const { generateAccessToken } = require('../../src/utils/tokens');
    authToken = generateAccessToken(user1);
  });

  describe('GET /api/v1/channels', () => {
    beforeEach(async () => {
      // Create test channels
      const channel1 = await Channel.create({
        name: 'Channel 1',
        type: 'group',
        createdBy: user1.id
      });

      const channel2 = await Channel.create({
        name: 'Channel 2',
        type: 'group',
        createdBy: user2.id
      });

      // Add user1 to both channels
      await ChannelMember.bulkCreate([
        { channelId: channel1.id, userId: user1.id, role: 'admin' },
        { channelId: channel2.id, userId: user1.id, role: 'member' }
      ]);
    });

    it('should retrieve user channels', async () => {
      const response = await request(app)
        .get('/api/v1/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.channels).toHaveLength(2);
      expect(response.body.data.channels[0].name).toBe('Channel 2');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/channels?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.channels).toHaveLength(1);
    });
  });

  describe('POST /api/v1/channels', () => {
    it('should create a new channel', async () => {
      const channelData = {
        name: 'New Test Channel',
        description: 'A test channel description',
        type: 'group',
        isPrivate: false,
        participantIds: [user2.id]
      };

      const response = await request(app)
        .post('/api/v1/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send(channelData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.channel.name).toBe(channelData.name);
      expect(response.body.data.channel.creator.id).toBe(user1.id);

      // Verify channel members were created
      const members = await ChannelMember.findAll({ 
        where: { channelId: response.body.data.channel.id } 
      });
      expect(members).toHaveLength(2); 
    });

    it('should validate channel creation data', async () => {
      const response = await request(app)
        .post('/api/v1/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({}) 
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/channels/:channelId/join', () => {
    let channel;

    beforeEach(async () => {
      channel = await Channel.create({
        name: 'Join Test Channel',
        type: 'group',
        createdBy: user2.id 
      });
    });

    it('should allow user to join channel', async () => {
      const response = await request(app)
        .post(`/api/v1/channels/${channel.id}/join`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify user was added to channel
      const membership = await ChannelMember.findOne({
        where: { channelId: channel.id, userId: user1.id }
      });
      expect(membership).toBeDefined();
    });
  });
});