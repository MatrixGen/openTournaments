// migrations/YYYYMMDDHHMMSS-create-activities-table.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('activities', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      activity_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      image_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      related_tournament_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tournaments',
          key: 'id',
        },
      },
      related_match_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'matches',
          key: 'id',
        },
      },
      related_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      points_earned: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      position_achieved: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      visibility: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'public',
      },
      activity_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('activities', ['user_id']);
    await queryInterface.addIndex('activities', ['user_id', 'activity_date']);
    await queryInterface.addIndex('activities', ['activity_type']);
    await queryInterface.addIndex('activities', ['activity_date']);
    await queryInterface.addIndex('activities', ['related_tournament_id']);
    await queryInterface.addIndex('activities', ['related_user_id']);
    await queryInterface.addIndex('activities', ['visibility']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('activities');
  },
};