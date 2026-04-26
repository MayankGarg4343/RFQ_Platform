const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'rfq_system',
    password: process.env.DB_PASSWORD || 'manki123',
    port: process.env.DB_PORT || 5432,
};

const pool = new Pool(dbConfig);

module.exports = {
    pool,
    dbConfig
};
