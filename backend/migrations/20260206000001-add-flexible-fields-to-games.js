'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('games', 'game_intent', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addColumn('games', 'banner_url', {
      type: Sequelize.STRING(512),
      allowNull: true,
    });
    await queryInterface.addColumn('games', 'cover_url', {
      type: Sequelize.STRING(512),
      allowNull: true,
    });
    await queryInterface.addColumn('games', 'promo_video_url', {
      type: Sequelize.STRING(512),
      allowNull: true,
    });
    await queryInterface.addColumn('games', 'is_featured', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn('games', 'sort_order', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('games', 'slug', {
      type: Sequelize.STRING(120),
      allowNull: true,
    });
    await queryInterface.addColumn('games', 'theme_color', {
      type: Sequelize.STRING(16),
      allowNull: true,
    });
    await queryInterface.addColumn('games', 'metadata', {
      type: Sequelize.JSONB,
      allowNull: true,
    });
    await queryInterface.addColumn('games', 'android_store_url', {
      type: Sequelize.STRING(512),
      allowNull: true,
    });
    await queryInterface.addColumn('games', 'ios_store_url', {
      type: Sequelize.STRING(512),
      allowNull: true,
    });
    await queryInterface.addColumn('games', 'supports_android', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await queryInterface.addColumn('games', 'supports_ios', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addIndex('games', ['game_intent'], {
      unique: true,
      name: 'games_game_intent_unique',
    });
    await queryInterface.addIndex('games', ['slug'], {
      unique: true,
      name: 'games_slug_unique',
    });
    await queryInterface.addIndex('games', ['is_featured'], {
      name: 'games_is_featured_index',
    });
    await queryInterface.addIndex('games', ['sort_order'], {
      name: 'games_sort_order_index',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('games', 'games_sort_order_index');
    await queryInterface.removeIndex('games', 'games_is_featured_index');
    await queryInterface.removeIndex('games', 'games_slug_unique');
    await queryInterface.removeIndex('games', 'games_game_intent_unique');

    await queryInterface.removeColumn('games', 'supports_ios');
    await queryInterface.removeColumn('games', 'supports_android');
    await queryInterface.removeColumn('games', 'ios_store_url');
    await queryInterface.removeColumn('games', 'android_store_url');
    await queryInterface.removeColumn('games', 'metadata');
    await queryInterface.removeColumn('games', 'theme_color');
    await queryInterface.removeColumn('games', 'slug');
    await queryInterface.removeColumn('games', 'sort_order');
    await queryInterface.removeColumn('games', 'is_featured');
    await queryInterface.removeColumn('games', 'promo_video_url');
    await queryInterface.removeColumn('games', 'cover_url');
    await queryInterface.removeColumn('games', 'banner_url');
    await queryInterface.removeColumn('games', 'game_intent');
  },
};
