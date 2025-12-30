'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Attachments', {
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
      url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'URL to the uploaded file'
      },
      thumbnailUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'URL to the thumbnail (for images/videos)'
      },
      type: {
        type: Sequelize.ENUM('image', 'video', 'audio', 'file'),
        allowNull: false,
      },
      fileName: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'File size in bytes'
      },
      mimeType: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional metadata (dimensions, duration, etc.)'
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

    // Indexes for performance
    await queryInterface.addIndex('Attachments', ['messageId'], {
      name: 'idx_attachments_message'
    });
    
    await queryInterface.addIndex('Attachments', ['type'], {
      name: 'idx_attachments_type'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Attachments', 'idx_attachments_message');
    await queryInterface.removeIndex('Attachments', 'idx_attachments_type');
    await queryInterface.dropTable('Attachments');
  }
};


