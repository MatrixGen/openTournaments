'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('matches', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      tournament_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tournaments',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      round_number: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      bracket_type: {
        type: Sequelize.ENUM('winners', 'losers', 'finals'),
        defaultValue: 'winners',
      },
      participant1_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tournament_participants',
          key: 'id',
        },
      },
      participant2_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tournament_participants',
          key: 'id',
        },
      },
      participant1_score: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      participant2_score: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('scheduled', 'completed', 'disputed', 'awaiting_confirmation'),
        defaultValue: 'scheduled',
      },
      scheduled_time: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      reported_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      winner_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'tournament_participants',
          key: 'id',
        },
      },
      reported_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      confirmed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      // ✅ New auto-confirmation columns
      auto_confirm_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      warning_sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      confirmed_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      auto_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      evidence_url: {
        type: Sequelize.STRING(512),
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('matches', ['tournament_id'], { name: 'idx_matches_tournament_id' });
    await queryInterface.addIndex('matches', ['participant1_id'], { name: 'idx_matches_participant1' });
    await queryInterface.addIndex('matches', ['participant2_id'], { name: 'idx_matches_participant2' });
    await queryInterface.addIndex('matches', ['reported_by_user_id']);
    await queryInterface.addIndex('matches', ['winner_id']);
    await queryInterface.addIndex('matches', ['confirmed_by_user_id'], { name: 'fk_matches_confirmed_by' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('matches');
  },
};
