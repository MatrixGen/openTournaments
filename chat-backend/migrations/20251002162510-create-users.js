'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('chatUsers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      platformUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        unique: true,
        comment: 'Reference to platform user ID'
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      passwordHash: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      profilePicture: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('online', 'offline', 'away'),
        defaultValue: 'offline',
      },
      lastSeen: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      isOnline: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      isModerator: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      isAdmin: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('chatUsers', ['email']);
    await queryInterface.addIndex('chatUsers', ['username']);
    await queryInterface.addIndex('chatUsers', ['status']);
    await queryInterface.addIndex('chatUsers', ['platformUserId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('chatUsers');
  }
};