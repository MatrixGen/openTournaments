// config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';

let dbConfig = {};

switch (env) {
  case 'test':
    dbConfig = {
      username: process.env.DB_USERNAME_TEST,
      password: process.env.DB_PASSWORD_TEST,
      database: process.env.DB_NAME_TEST,
      host: process.env.DB_HOST_TEST,
      port: process.env.DB_PORT_TEST || 3306,
    };
    break;

  case 'production':
    dbConfig = {
      username: process.env.DB_USERNAME_PROD,
      password: process.env.DB_PASSWORD_PROD,
      database: process.env.DB_NAME_PROD,
      host: process.env.DB_HOST_PROD,
      port: process.env.DB_PORT || 3306,
    };
    break;

  default:
    dbConfig = {
      username: process.env.DB_USERNAME_DEV,
      password: process.env.DB_PASSWORD_DEV,
      database: process.env.DB_NAME_DEV,
      host: process.env.DB_HOST_DEV,
      port: process.env.DB_PORT || 3306,
    };
    break;
}

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

module.exports = sequelize;
