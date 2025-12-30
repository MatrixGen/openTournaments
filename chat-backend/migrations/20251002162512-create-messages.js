'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Messages', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true, // Allow null for media-only messages
      },
      type: {
        type: Sequelize.ENUM('text', 'image', 'video', 'file', 'audio', 'system'),
        defaultValue: 'text',
      },
      channelId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'Channels',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'chatUsers', // Changed from 'chatUsers' to 'Users' (assuming standard User table)
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      replyTo: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'Messages',
          key: 'id',
        },
      },
      // New fields for media support
      mediaUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'URL to the uploaded media file'
      },
      mediaMetadata: {
        type: Sequelize.JSONB, // Use JSONB for PostgreSQL, JSON for MySQL
        allowNull: true,
        comment: 'Metadata about the media (size, dimensions, duration, etc.)'
      },
      // Message edit tracking
      isEdited: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      editedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      // Soft delete support
      isDeleted: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      deletedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'chatUsers',
          key: 'id',
        },
        comment: 'User who deleted the message'
      },
      // Content moderation fields
      isModerated: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether the message has been moderated/filtered'
      },
      moderationFlags: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Array of moderation violations found in the message'
      },
      // Timestamps
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

    // Critical indexes for performance
    await queryInterface.addIndex('Messages', ['channelId', 'createdAt'], {
      name: 'idx_messages_channel_created'
    });
    
    await queryInterface.addIndex('Messages', ['userId'], {
      name: 'idx_messages_user'
    });
    
    await queryInterface.addIndex('Messages', ['replyTo'], {
      name: 'idx_messages_reply'
    });
    
    await queryInterface.addIndex('Messages', ['createdAt'], {
      name: 'idx_messages_created'
    });
    
    await queryInterface.addIndex('Messages', ['isDeleted'], {
      name: 'idx_messages_deleted'
    });
    
    await queryInterface.addIndex('Messages', ['type'], {
      name: 'idx_messages_type'
    });
    
    // Composite index for common queries
    await queryInterface.addIndex('Messages', ['channelId', 'isDeleted', 'createdAt'], {
      name: 'idx_messages_channel_not_deleted_created'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('Messages', 'idx_messages_channel_created');
    await queryInterface.removeIndex('Messages', 'idx_messages_user');
    await queryInterface.removeIndex('Messages', 'idx_messages_reply');
    await queryInterface.removeIndex('Messages', 'idx_messages_created');
    await queryInterface.removeIndex('Messages', 'idx_messages_deleted');
    await queryInterface.removeIndex('Messages', 'idx_messages_type');
    await queryInterface.removeIndex('Messages', 'idx_messages_channel_not_deleted_created');
    
    // Drop the table
    await queryInterface.dropTable('Messages');
  }
};