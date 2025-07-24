const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DB_URL ,
});


pool.on('connect', () => {~
    console.log('Connected to the database');
});

pool.on('error', (err) => {
    console.error('Error with the database', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};