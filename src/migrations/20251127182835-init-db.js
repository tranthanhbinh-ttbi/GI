'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Tạo bảng Users
    await queryInterface.createTable('users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      provider: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      provider_id: { // Lưu ý: underscored: true biến providerId thành provider_id
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true
      },
      avatar_url: { // underscored: true
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
    });

    // Thêm Index cho bảng Users
    await queryInterface.addIndex('users', ['provider']);

    // 2. Tạo bảng Followers
    await queryInterface.createTable('followers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      user_id: { // Foreign Key
        type: Sequelize.BIGINT,
        allowNull: false,
        unique: true,
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
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('followers');
    await queryInterface.dropTable('users');
  }
};