'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add firebase_uid column
    await queryInterface.addColumn('users', 'firebase_uid', {
      type: Sequelize.STRING(128),
      allowNull: true,
      unique: true,
      comment: 'Firebase Authentication UID - primary auth identifier'
    });

    // Add index for faster lookups
    await queryInterface.addIndex('users', ['firebase_uid'], {
      name: 'users_firebase_uid_idx',
      unique: true,
      where: {
        firebase_uid: {
          [Sequelize.Op.ne]: null
        }
      }
    });

    // Update oauth_provider ENUM to include 'firebase'
    // Note: This requires recreating the ENUM type in PostgreSQL
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_users_oauth_provider" ADD VALUE IF NOT EXISTS 'firebase';
    `);

    console.log('✅ Migration: Added firebase_uid column to users table');
  },

  async down(queryInterface, Sequelize) {
    // Remove index
    await queryInterface.removeIndex('users', 'users_firebase_uid_idx');
    
    // Remove column
    await queryInterface.removeColumn('users', 'firebase_uid');
    
    console.log('✅ Migration: Removed firebase_uid column from users table');
  }
};
