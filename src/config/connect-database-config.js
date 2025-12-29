require('dotenv').config();

const Connect_DB_Config = {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 1,
    min: 0,
    idle: 10000,
    acquire: 30000
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: true
    },
    keepAlive: true
  }
};

module.exports = {
  development: Connect_DB_Config,
  production: Connect_DB_Config,
};