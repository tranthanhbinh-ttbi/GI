const { DataTypes } = require('sequelize')
const sequelize = require('../config/database-config')

const User = sequelize.define('User', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  provider: { type: DataTypes.STRING(50), allowNull: false },
  providerId: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(255), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: true, unique: true },
  avatarUrl: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'users',
  underscored: true,
  indexes: [{ fields: ['provider'], using: 'BTREE' }],
})

const Follower = sequelize.define('Follower', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.BIGINT, allowNull: false, unique: true },
}, {
  tableName: 'followers',
  underscored: true,
})

User.hasOne(Follower, { foreignKey: 'userId', onDelete: 'CASCADE' })
Follower.belongsTo(User, { foreignKey: 'userId' })

async function migrate() {
  await sequelize.authenticate()
}

module.exports = { sequelize, User, Follower, migrate }