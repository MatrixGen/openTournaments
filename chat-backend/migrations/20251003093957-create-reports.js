'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Reports', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      messageId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Messages',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reporterId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'chatUsers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reportedUserId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'chatUsers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reason: {
        type: Sequelize.ENUM(
          'spam',
          'harassment',
          'inappropriate_content',
          'hate_speech',
          'other'
        ),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending', 'reviewed', 'resolved', 'dismissed'),
        defaultValue: 'pending',
      },
      moderatorNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      resolvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      resolvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'chatUsers',
          key: 'id',
        },
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

    await queryInterface.addIndex('Reports', ['messageId', 'reporterId'], {
      unique: true,
    });
    await queryInterface.addIndex('Reports', ['status']);
    await queryInterface.addIndex('Reports', ['reportedUserId']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Reports');
  }
};