require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    // host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: {
            require: true, // Bắt buộc SSL cho Neon
            rejectUnauthorized: false // Chấp nhận chứng chỉ tự ký (thường cần thiết cho các cloud DB)
        }
    },
    pool: {
        max: 20,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

module.exports = sequelize;