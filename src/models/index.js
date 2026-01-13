const { DataTypes, Op } = require('sequelize')
const sequelize = require('../config/database-config')

const User = sequelize.define('User', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  provider: {
    type: DataTypes.ENUM('google', 'facebook'),
    allowNull: false
  },
  providerId: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true
  },
  avatarUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  violationCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'violation_count'
  },
  isBanned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_banned'
  }
}, {
  tableName: 'users',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['provider', 'provider_id'],
      name: 'users_provider_providerid_unique'
    },
    {
      unique: true,
      fields: ['email'],
      where: { email: { [Op.ne]: null } }
    }
  ]
})

const Subscribes = sequelize.define('Subscribes', {
  userId: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
}, {
  tableName: 'subscribes',
  underscored: true,
  timestamps: true
})

User.hasOne(Subscribes, { foreignKey: 'userId', onDelete: 'CASCADE', onUpdate: 'CASCADE' })
Subscribes.belongsTo(User, { foreignKey: 'userId' })

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('info', 'success', 'warning', 'new_post'),
    defaultValue: 'info'
  },
  link: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isGlobal: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_global'
  }
}, {
  tableName: 'notifications',
  underscored: true,
  timestamps: true
})

const UserNotification = sequelize.define('UserNotification', {
  userId: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  notificationId: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    references: {
      model: 'notifications',
      key: 'id'
    }
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'user_notifications',
  underscored: true,
  timestamps: true
})

User.belongsToMany(Notification, { through: UserNotification, foreignKey: 'userId', otherKey: 'notificationId' })
Notification.belongsToMany(User, { through: UserNotification, foreignKey: 'notificationId', otherKey: 'userId' })
User.hasMany(UserNotification, { foreignKey: 'userId' })
UserNotification.belongsTo(User, { foreignKey: 'userId' })
Notification.hasMany(UserNotification, { foreignKey: 'notificationId' })
UserNotification.belongsTo(Notification, { foreignKey: 'notificationId' })

const PostRating = sequelize.define('PostRating', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  postSlug: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  }
}, {
  tableName: 'post_ratings',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'post_slug']
    }
  ]
})

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  postSlug: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'flagged', 'rejected'),
    defaultValue: 'pending'
  },
  toxicityScore: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0,
    field: 'toxicity_score'
  },
  parentId: {
    type: DataTypes.BIGINT,
    allowNull: true,
    references: {
      model: 'post_comments',
      key: 'id'
    }
  }
}, {
  tableName: 'post_comments',
  underscored: true,
  timestamps: true
})

// === NEW: Comment Report Model ===
const CommentReport = sequelize.define('CommentReport', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  commentId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'post_comments',
      key: 'id'
    }
  },
  reporterId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'resolved', 'dismissed'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'comment_reports',
  underscored: true,
  timestamps: true
});

User.hasMany(PostRating, { foreignKey: 'userId' })
PostRating.belongsTo(User, { foreignKey: 'userId' })

User.hasMany(Comment, { foreignKey: 'userId' })
Comment.belongsTo(User, { foreignKey: 'userId' })

Comment.hasMany(Comment, { as: 'replies', foreignKey: 'parentId' })
Comment.belongsTo(Comment, { as: 'parent', foreignKey: 'parentId' })

// Report Associations
Comment.hasMany(CommentReport, { foreignKey: 'commentId', onDelete: 'CASCADE' });
CommentReport.belongsTo(Comment, { foreignKey: 'commentId' });
User.hasMany(CommentReport, { foreignKey: 'reporterId' });
CommentReport.belongsTo(User, { foreignKey: 'reporterId' });

const PostMeta = sequelize.define('PostMeta', {
  slug: {
    type: DataTypes.STRING(255),
    primaryKey: true,
    allowNull: false
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  avgRating: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    field: 'avg_rating'
  },
  totalRatings: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_ratings'
  }
}, {
  tableName: 'post_meta',
  underscored: true,
  timestamps: true
})

const ViolationLog = sequelize.define('ViolationLog', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.BIGINT,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  postSlug: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'post_slug'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'violation_logs',
  underscored: true,
  timestamps: true
})

User.hasMany(ViolationLog, { foreignKey: 'userId' })
ViolationLog.belongsTo(User, { foreignKey: 'userId' })

const PostViewLog = sequelize.define('PostViewLog', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true
  },
  ip: {
    type: DataTypes.STRING(45),
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING(255),
    allowNull: false
  }
}, {
  tableName: 'post_view_logs',
  underscored: true,
  timestamps: true,
  indexes: [
    {
      fields: ['ip', 'slug']
    },
    {
      fields: ['created_at']
    }
  ]
})

const migrate = async () => {
  try {
    await sequelize.authenticate()
    console.log('Connection to Database has been established successfully.')
    await sequelize.sync({ alter: true })
    console.log('Database synced successfully.')
  } catch (error) {
    console.error('Unable to connect to the database:', error)
    throw error
  }
}

module.exports = { sequelize, User, Subscribes, Notification, UserNotification, PostRating, Comment, CommentReport, PostMeta, ViolationLog, PostViewLog, migrate }