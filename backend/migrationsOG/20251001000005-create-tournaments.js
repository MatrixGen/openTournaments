'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tournaments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      game_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'games',
          key: 'id'
        }
      },
      platform_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'platforms',
          key: 'id'
        }
      },
      game_mode_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'game_modes',
          key: 'id'
        }
      },
      format: {
        type: Sequelize.ENUM('single_elimination','double_elimination','round_robin'),
        defaultValue: 'single_elimination'
      },
      entry_fee: {
        type: Sequelize.DECIMAL(10,2),
        allowNull: false
      },
      total_slots: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      current_slots: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      status: {
        type: Sequelize.ENUM('open','locked','live','completed','cancelled'),
        allowNull: false,
        defaultValue: 'open'
      },
      visibility: {
        type: Sequelize.ENUM('public','private'),
        defaultValue: 'public'
      },
      rules: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      start_time: {
        type: Sequelize.DATE,
        allowNull: true
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
      },

    });

    // Add indexes
    await queryInterface.addIndex('tournaments', ['game_id'], { name: 'idx_tournaments_game_id' });
    await queryInterface.addIndex('tournaments', ['status'], { name: 'idx_tournaments_status' });
    await queryInterface.addIndex('tournaments', ['platform_id'], { name: 'idx_tournaments_platform' });
    await queryInterface.addIndex('tournaments', ['game_mode_id'], { name: 'idx_tournaments_game_mode' });
    await queryInterface.addIndex('tournaments', ['created_by'], { name: 'tournaments_created_by' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tournaments_format";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tournaments_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_tournaments_visibility";');
    await queryInterface.dropTable('tournaments');
  }
};
