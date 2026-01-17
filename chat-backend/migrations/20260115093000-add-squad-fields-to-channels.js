'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableExists = async (tableName) => {
        const [rows] = await queryInterface.sequelize.query(
          'SELECT to_regclass(:tableName) AS table_name;',
          { replacements: { tableName }, transaction }
        );
        return Boolean(rows?.[0]?.table_name);
      };
      const indexExists = async (indexName) => {
        const [rows] = await queryInterface.sequelize.query(
          'SELECT to_regclass(:indexName) AS index_name;',
          { replacements: { indexName }, transaction }
        );
        return Boolean(rows?.[0]?.index_name);
      };

      await queryInterface.sequelize.query(
        'ALTER TYPE "enum_Channels_type" ADD VALUE IF NOT EXISTS \'squad\';',
        { transaction }
      );

      await queryInterface.addColumn(
        'Channels',
        'relatedGameId',
        { type: Sequelize.INTEGER, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'squadTag',
        { type: Sequelize.STRING(10), allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'squadType',
        {
          type: Sequelize.ENUM('casual', 'competitive', 'tournament'),
          allowNull: false,
          defaultValue: 'casual',
        },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'visibility',
        {
          type: Sequelize.ENUM('public', 'private', 'invite_only'),
          allowNull: false,
          defaultValue: 'public',
        },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'joinPolicy',
        {
          type: Sequelize.ENUM('open', 'request', 'invite'),
          allowNull: false,
          defaultValue: 'open',
        },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'maxMembers',
        { type: Sequelize.INTEGER, allowNull: false, defaultValue: 50 },
        { transaction }
      );

      await queryInterface.addColumn(
        'Channels',
        'logoUrl',
        { type: Sequelize.STRING, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'bannerUrl',
        { type: Sequelize.STRING, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'accentColor',
        { type: Sequelize.STRING(7), allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'shortDescription',
        { type: Sequelize.STRING(160), allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'externalLink',
        { type: Sequelize.STRING, allowNull: true },
        { transaction }
      );

      await queryInterface.addColumn(
        'Channels',
        'primaryMode',
        { type: Sequelize.STRING, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'region',
        { type: Sequelize.STRING, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'currentMatchId',
        { type: Sequelize.INTEGER, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'lastActivityAt',
        { type: Sequelize.DATE, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'lastMatchAt',
        { type: Sequelize.DATE, allowNull: true },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'wins',
        { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'losses',
        { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'draws',
        { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'rating',
        { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        { transaction }
      );

      await queryInterface.addColumn(
        'Channels',
        'isVerified',
        { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'isFeatured',
        { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'reportCount',
        { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        { transaction }
      );
      await queryInterface.addColumn(
        'Channels',
        'suspendedAt',
        { type: Sequelize.DATE, allowNull: true },
        { transaction }
      );

      await queryInterface.sequelize.query(
        'UPDATE "Channels" SET "visibility" = \'private\' WHERE "visibility" IS NULL AND "isPrivate" = true;',
        { transaction }
      );

      if (!(await indexExists('idx_channels_related_game_id'))) {
        await queryInterface.addIndex('Channels', ['relatedGameId'], {
          name: 'idx_channels_related_game_id',
          transaction,
        });
      }
      if (!(await indexExists('idx_channels_current_match_id'))) {
        await queryInterface.addIndex('Channels', ['currentMatchId'], {
          name: 'idx_channels_current_match_id',
          transaction,
        });
      }

      if (await tableExists('games')) {
        await queryInterface.addConstraint('Channels', {
          fields: ['relatedGameId'],
          type: 'foreign key',
          name: 'fk_channels_related_game',
          references: {
            table: 'games',
            field: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          transaction,
        });
      }

      if (await tableExists('matches')) {
        await queryInterface.addConstraint('Channels', {
          fields: ['currentMatchId'],
          type: 'foreign key',
          name: 'fk_channels_current_match',
          references: {
            table: 'matches',
            field: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const constraintExists = async (constraintName) => {
        const [rows] = await queryInterface.sequelize.query(
          'SELECT conname FROM pg_constraint WHERE conname = :constraintName;',
          { replacements: { constraintName }, transaction }
        );
        return rows?.length > 0;
      };
      const indexExists = async (indexName) => {
        const [rows] = await queryInterface.sequelize.query(
          'SELECT to_regclass(:indexName) AS index_name;',
          { replacements: { indexName }, transaction }
        );
        return Boolean(rows?.[0]?.index_name);
      };

      if (await constraintExists('fk_channels_current_match')) {
        await queryInterface.removeConstraint('Channels', 'fk_channels_current_match', {
          transaction,
        });
      }
      if (await constraintExists('fk_channels_related_game')) {
        await queryInterface.removeConstraint('Channels', 'fk_channels_related_game', {
          transaction,
        });
      }
      if (await indexExists('idx_channels_current_match_id')) {
        await queryInterface.removeIndex('Channels', 'idx_channels_current_match_id', {
          transaction,
        });
      }
      if (await indexExists('idx_channels_related_game_id')) {
        await queryInterface.removeIndex('Channels', 'idx_channels_related_game_id', {
          transaction,
        });
      }

      await queryInterface.removeColumn('Channels', 'suspendedAt', { transaction });
      await queryInterface.removeColumn('Channels', 'reportCount', { transaction });
      await queryInterface.removeColumn('Channels', 'isFeatured', { transaction });
      await queryInterface.removeColumn('Channels', 'isVerified', { transaction });
      await queryInterface.removeColumn('Channels', 'rating', { transaction });
      await queryInterface.removeColumn('Channels', 'draws', { transaction });
      await queryInterface.removeColumn('Channels', 'losses', { transaction });
      await queryInterface.removeColumn('Channels', 'wins', { transaction });
      await queryInterface.removeColumn('Channels', 'lastMatchAt', { transaction });
      await queryInterface.removeColumn('Channels', 'lastActivityAt', { transaction });
      await queryInterface.removeColumn('Channels', 'currentMatchId', { transaction });
      await queryInterface.removeColumn('Channels', 'region', { transaction });
      await queryInterface.removeColumn('Channels', 'primaryMode', { transaction });
      await queryInterface.removeColumn('Channels', 'externalLink', { transaction });
      await queryInterface.removeColumn('Channels', 'shortDescription', { transaction });
      await queryInterface.removeColumn('Channels', 'accentColor', { transaction });
      await queryInterface.removeColumn('Channels', 'bannerUrl', { transaction });
      await queryInterface.removeColumn('Channels', 'logoUrl', { transaction });
      await queryInterface.removeColumn('Channels', 'maxMembers', { transaction });
      await queryInterface.removeColumn('Channels', 'joinPolicy', { transaction });
      await queryInterface.removeColumn('Channels', 'visibility', { transaction });
      await queryInterface.removeColumn('Channels', 'squadType', { transaction });
      await queryInterface.removeColumn('Channels', 'squadTag', { transaction });
      await queryInterface.removeColumn('Channels', 'relatedGameId', { transaction });

      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Channels_squadType";', {
        transaction,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Channels_visibility";', {
        transaction,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Channels_joinPolicy";', {
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
