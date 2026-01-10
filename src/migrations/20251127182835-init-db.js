'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (ts) => {
      await queryInterface.createTable('users', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT
        },
        provider: {
          type: Sequelize.ENUM('google', 'facebook'),
          allowNull: false
        },
        provider_id: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        name: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        avatar_url: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE
        }
      }, { transaction: ts });

      await queryInterface.addIndex('users', ['provider', 'provider_id'], {
        unique: true,
        name: 'users_provider_providerid_unique',
        transaction: ts
      });
      
      await queryInterface.addIndex('users', ['email'], {
        unique: true,
        where: { email: { [Sequelize.Op.ne]: null } },
        transaction: ts
      });

      await queryInterface.createTable('subscribes', {
        user_id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE
        }
      }, { transaction: ts });
    });
  },

  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (ts) => {
      await queryInterface.dropTable('subscribes', { transaction: ts });
      await queryInterface.dropTable('users', { transaction: ts });
    });
  }
};