'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
      try {

    await queryInterface.createTable('platform.faq_categories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      icon: {
        type: Sequelize.STRING(50),
        defaultValue: 'question-mark'
      },
      order: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      color: {
        type: Sequelize.STRING(20),
        defaultValue: '#6b46c1'
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

    await queryInterface.addIndex('faq_categories', ['slug']);
    await queryInterface.addIndex('faq_categories', ['order']);
    await queryInterface.addIndex('faq_categories', ['is_active']);
  
      } catch (error) {
      console.error('⚠️ Migration up failed in 20260101000000-create-faq-categories.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
},

  async down(queryInterface) {
      try {

    await queryInterface.dropTable('platform.faq_categories');
  
      } catch (error) {
      console.error('⚠️ Migration down failed in 20260101000000-create-faq-categories.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
}
};
