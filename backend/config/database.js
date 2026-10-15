const mysql = require('mysql2/promise');
require('dotenv').config();

// ---------------------------------------------------------------------------
// MySQL (XAMPP) connection pool.
//
// The routes were written for mysql2 and use:
//   const [rows] = await pool.query('SELECT ... WHERE id = ?', [id]);
//   const [result] = await pool.query('INSERT INTO ... VALUES (?)', [v]);
//   result.insertId
//   const conn = await pool.getConnection(); conn.beginTransaction(); ...
// ---------------------------------------------------------------------------

const DB_NAME = process.env.DB_NAME || 'telugu_icon_awards';

const poolConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE) || 10,
  queueLimit: Number(process.env.DB_QUEUE_LIMIT) || 50000,
  charset: 'utf8mb4_unicode_ci',
  timezone: process.env.DB_TIMEZONE || 'Z',
  dateStrings: false,
  supportBigNumbers: true,
  bigNumberStrings: false,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

const pool = mysql.createPool(poolConfig);

pool.on('connection', (conn) => {
  // Fail fast instead of hanging the request if the server drops the link.
  conn.on('error', (err) => {
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.error('MySQL connection lost:', err.message);
    }
  });
});

const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    console.log(`✓ MySQL Connected Successfully (${DB_NAME} @ ${poolConfig.host}:${poolConfig.port})`);
    return true;
  } catch (error) {
    console.error('✗ MySQL Connection Failed:', error.message);
    return false;
  }
};

module.exports = { pool, testConnection, DB_NAME, poolConfig };