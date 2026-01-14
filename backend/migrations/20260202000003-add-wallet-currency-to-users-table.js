'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'wallet_currency', {
      type: Sequelize.STRING(3),
      allowNull: false,
      defaultValue: 'TZS',
    });

    await queryInterface.bulkUpdate(
      'users',
      { wallet_currency: 'TZS' },
      { wallet_currency: null }
    );

    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'postgres') {
      await queryInterface.addConstraint('users', {
        fields: ['wallet_currency'],
        type: 'check',
        name: 'users_wallet_currency_check',
        where: {
          wallet_currency: ['USD', 'TZS'],
        },
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'postgres') {
      await queryInterface.removeConstraint('users', 'users_wallet_currency_check');
    }

    await queryInterface.removeColumn('users', 'wallet_currency');
  },
};
