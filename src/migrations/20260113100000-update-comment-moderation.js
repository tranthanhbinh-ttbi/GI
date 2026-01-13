'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Update post_comments table
    await queryInterface.addColumn('post_comments', 'status', {
      type: Sequelize.ENUM('pending', 'approved', 'flagged', 'rejected'),
      defaultValue: 'pending',
      allowNull: false
    });

    await queryInterface.addColumn('post_comments', 'toxicity_score', {
      type: Sequelize.FLOAT,
      defaultValue: 0.0,
      allowNull: true
    });

    // 2. Create comment_reports table
    await queryInterface.createTable('comment_reports', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      comment_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'post_comments',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      reporter_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      reason: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'resolved', 'dismissed'),
        defaultValue: 'pending'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add index for faster lookup
    await queryInterface.addIndex('post_comments', ['status']);
    await queryInterface.addIndex('post_comments', ['post_slug', 'status']); // Filter approved comments per post
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('comment_reports');
    await queryInterface.removeColumn('post_comments', 'status');
    await queryInterface.removeColumn('post_comments', 'toxicity_score');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_post_comments_status";');
  }
};
