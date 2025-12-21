'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('series', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      tournament_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tournaments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      participant1_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tournament_participants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      participant2_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tournament_participants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      participant1_wins: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
          min: 0,
          max: 2
        }
      },
      participant2_wins: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
          min: 0,
          max: 2
        }
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'active',
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('series', ['tournament_id'], {
      unique: true,
      name: 'series_tournament_unique'
    });
    await queryInterface.addIndex('series', ['participant1_id']);
    await queryInterface.addIndex('series', ['participant2_id']);
    await queryInterface.addIndex('series', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('series');
  }
};