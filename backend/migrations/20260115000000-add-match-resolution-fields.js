'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('matches', 'resolved_reason', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('matches', 'resolved_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn('matches', 'resolved_by', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('matches', 'forfeit_user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'SET NULL',
    });

    await queryInterface.addColumn('matches', 'forfeit_participant_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'tournament_participants',
        key: 'id',
      },
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('matches', 'forfeit_participant_id');
    await queryInterface.removeColumn('matches', 'forfeit_user_id');
    await queryInterface.removeColumn('matches', 'resolved_by');
    await queryInterface.removeColumn('matches', 'resolved_at');
    await queryInterface.removeColumn('matches', 'resolved_reason');
  },
};
