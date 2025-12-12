'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserViolations', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM(
          'profanity',
          'spam',
          'harassment',
          'suspicious_content',
          'excessive_caps'
        ),
        allowNull: false,
      },
      severity: {
        type: Sequelize.ENUM('low', 'medium', 'high'),
        defaultValue: 'low',
      },
      messageContent: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      automated: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      resolved: {
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

    await queryInterface.addIndex('UserViolations', ['userId', 'createdAt']);
    await queryInterface.addIndex('UserViolations', ['type']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('UserViolations');
  }
};