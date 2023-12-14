const mysql = require('mysql2')
require('dotenv').config()

const poolMysql = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  database: process.env.MYSQL_DATABASE,
  password: process.env.MYSQL_PASSWORD,
  port: process.env.MYSQL_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
})

poolMysql.getConnection(function (err, conn) {
  if (err) {
    console.error('error=', err)
  }
  conn.query('SELECT NOW() as currentTime', function (error, result) {
    console.log('Kết nối thành công vào MySQL, thời gian hiện tại:', result[0].currentTime)
  })
  poolMysql.releaseConnection(conn)
})

module.exports = poolMysql
