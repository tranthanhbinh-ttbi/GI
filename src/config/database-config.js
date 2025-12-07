require('dotenv').config();
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    pool: {
        max: 1,
        min: 0,
        idle: 10000,
        acquire: 5000
    },
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: true
        },
        keepAlive: true
    }
});

module.exports = sequelize;