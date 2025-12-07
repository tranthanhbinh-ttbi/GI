require('dotenv').config();

const Connect_DB_Config = {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  logging: false,
  pool: {
    max: 60,
    min: 5,
    idle: 10000,
    acquire: 5000
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    },
    keepAlive: true
  }
};

module.exports = {
  development: Connect_DB_Config,
  production: Connect_DB_Config,
};