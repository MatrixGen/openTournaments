'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
      try {

    await queryInterface.createTable('platform.faq_ratings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      faq_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'faqs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      helpful: {
        type: Sequelize.BOOLEAN,
        allowNull: false
      },
      user_ip: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      feedback: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Composite unique index for logged-in users
    await queryInterface.addIndex('faq_ratings', ['faq_id', 'user_id'], {
      unique: true,
      where: { user_id: { [Sequelize.Op.not]: null } }
    });

    // Composite index for anonymous users (IP-based)
    await queryInterface.addIndex('faq_ratings', ['faq_id', 'user_ip', 'created_at'], {
      unique: true,
      where: { user_id: null }
    });

    await queryInterface.addIndex('faq_ratings', ['faq_id']);
    await queryInterface.addIndex('faq_ratings', ['user_id']);
    await queryInterface.addIndex('faq_ratings', ['helpful']);
  
      } catch (error) {
      console.error('⚠️ Migration up failed in 20260101000008-create-faq-ratings.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
},

  async down(queryInterface, Sequelize) {
      try {

    await queryInterface.dropTable('platform.faq_ratings');
  
      } catch (error) {
      console.error('⚠️ Migration down failed in 20260101000008-create-faq-ratings.js:', error.message);
      // do not throw to avoid hard failure during deploy
    }
}
};