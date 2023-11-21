const { Pool } = require('pg');

// Tạo pool
const pool = new Pool({
    user: "taiproduaxe",
    host: "dpg-cjt898h5mpss738mq070-a.singapore-postgres.render.com",
    database: "datdundinh",
    password: "X3K8bx6Xa9Fx3CK9IbT1jiVJ5ls3h9tZ",
    port: 5432,
    ssl: true,
});

pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT false
  );
`);

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Lỗi khi kết nối đến PostgreSQL:', err);
    } else {
        console.log('Kết nối thành công vào PostgreSQL, thời gian hiện tại:', res.rows[0].now);
    }
});

// Xuất pool
module.exports = pool;
