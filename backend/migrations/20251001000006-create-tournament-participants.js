'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tournament_participants', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      tournament_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'tournaments',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      gamer_tag: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      final_standing: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      checked_in: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('tournament_participants', ['tournament_id', 'user_id'], { unique: true, name: 'unique_participation' });
    await queryInterface.addIndex('tournament_participants', ['tournament_id'], { name: 'idx_participants_tournament_id' });
    await queryInterface.addIndex('tournament_participants', ['user_id'], { name: 'idx_participants_user_id' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('tournament_participants', 'unique_participation');
    await queryInterface.removeIndex('tournament_participants', 'idx_participants_tournament_id');
    await queryInterface.removeIndex('tournament_participants', 'idx_participants_user_id');
    await queryInterface.dropTable('tournament_participants');
  }
};
