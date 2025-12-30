'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Reactions', {
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
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'chatUsers',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      emoji: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Emoji character or shortcode'
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

    // Unique constraint to prevent duplicate reactions from same user
    await queryInterface.addConstraint('Reactions', {
      fields: ['messageId', 'userId', 'emoji'],
      type: 'unique',
      name: 'unique_reaction_per_user_message_emoji'
    });

    // Performance indexes
    await queryInterface.addIndex('Reactions', ['messageId'], {
      name: 'idx_reactions_message'
    });
    
    await queryInterface.addIndex('Reactions', ['userId'], {
      name: 'idx_reactions_user'
    });
    
    await queryInterface.addIndex('Reactions', ['emoji'], {
      name: 'idx_reactions_emoji'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('Reactions', 'unique_reaction_per_user_message_emoji');
    await queryInterface.removeIndex('Reactions', 'idx_reactions_message');
    await queryInterface.removeIndex('Reactions', 'idx_reactions_user');
    await queryInterface.removeIndex('Reactions', 'idx_reactions_emoji');
    await queryInterface.dropTable('Reactions');
  }
};