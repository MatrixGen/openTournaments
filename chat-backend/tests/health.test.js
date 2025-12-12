const request = require('supertest');
const app = require('../src/app');

describe('Health Check', () => {
  it('should return 200 and server status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('OK');
    expect(response.body.timestamp).toBeDefined();
  });
});