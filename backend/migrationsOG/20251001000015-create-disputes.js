'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('disputes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      match_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'matches',
          key: 'id'
        }
      },
      raised_by_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      evidence_url: {
        type: Sequelize.STRING(512),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('open', 'under_review', 'resolved'),
        defaultValue: 'open'
      },
      resolution_details: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      resolved_by_admin_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      closed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null
      }
    });

    // Add indexes
    await queryInterface.addIndex('disputes', ['match_id'], { name: 'idx_disputes_match_id' });
    await queryInterface.addIndex('disputes', ['raised_by_user_id'], { name: 'idx_disputes_raised_by' });
    await queryInterface.addIndex('disputes', ['resolved_by_admin_id'], { name: 'resolved_by_admin_id' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('disputes');
  }
};
