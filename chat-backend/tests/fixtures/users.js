const testUsers = {
  regularUser: {
    email: 'test@example.com',
    password: 'password123',
    username: 'testuser'
  },
  secondUser: {
    email: 'test2@example.com',
    password: 'password123',
    username: 'testuser2'
  },
  moderatorUser: {
    email: 'moderator@example.com',
    password: 'password123',
    username: 'moderator',
    isModerator: true
  },
  adminUser: {
    email: 'admin@example.com',
    password: 'password123',
    username: 'admin',
    isAdmin: true
  }
};

const createTestUser = async (User, userData) => {
  const { hashPassword } = require('../../src/utils/password');
  const passwordHash = await hashPassword(userData.password);
  
  return await User.create({
    ...userData,
    passwordHash
  });
};

module.exports = {
  testUsers,
  createTestUser
};