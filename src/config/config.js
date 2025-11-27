// src/config/config.js
require('dotenv').config();

module.exports = {
  development: {
    use_env_variable: 'DATABASE_URL', // Ưu tiên dùng chuỗi kết nối
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};