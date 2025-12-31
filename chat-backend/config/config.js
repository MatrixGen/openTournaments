require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USERNAME_DEV,
    password: process.env.DB_PASSWORD_DEV,
    database: process.env.DB_NAME_DEV,
    host: process.env.DB_HOST_DEV,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  },
  test: {
    username: process.env.DB_USERNAME_TEST,
    password: process.env.DB_PASSWORD_TEST,
    database: process.env.DB_NAME_TEST,
    host: process.env.DB_HOST_TEST,
    port: process.env.DB_PORT_TEST || 5432,
    dialect: 'postgres',
    logging: false,
  },
  production: {
    username: process.env.DB_USER,          // matches your Docker Compose env
    password: process.env.DB_PASSWORD,      // matches your Docker Compose env
    database: process.env.DB_NAME,          // matches your Docker Compose env
    schema: "platform",
    host: process.env.DB_HOST,              // matches your Docker Compose env
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
  },
};
