'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('faqs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      question: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      answer: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'faq_categories',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      subcategory: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      helpful_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      not_helpful_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      view_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      last_viewed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      tags: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      related_faqs: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      is_published: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      popularity_score: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0
      },
      language: {
        type: Sequelize.STRING(10),
        defaultValue: 'en'
      },
      meta_title: {
        type: Sequelize.STRING(200),
        allowNull: true
      },
      meta_description: {
        type: Sequelize.STRING(500),
        allowNull: true
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

    await queryInterface.addIndex('faqs', ['category_id']);
    await queryInterface.addIndex('faqs', ['subcategory']);
    await queryInterface.addIndex('faqs', ['is_published']);
    await queryInterface.addIndex('faqs', ['popularity_score']);
    await queryInterface.addIndex('faqs', ['created_by']);

    // PostgreSQL full-text search using GIN index
    await queryInterface.sequelize.query(`
      CREATE INDEX faq_search_idx ON faqs USING GIN (
        to_tsvector('english', coalesce(question,'') || ' ' || coalesce(answer,''))
      );
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS faq_search_idx`);
    await queryInterface.dropTable('faqs');
  }
};
