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

const migrate = async () => {
  try {
    await sequelize.authenticate()
    console.log('Connection to Database has been established successfully.')
    await sequelize.sync()
    console.log('Database synced successfully.')
  } catch (error) {
    console.error('Unable to connect to the database:', error)
    throw error
  }
}

module.exports = { sequelize, User, Subscribes, Notification, migrate }