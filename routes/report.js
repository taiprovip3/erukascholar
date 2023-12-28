const express = require('express')
const pool = require('../utils/db')
const { preparedStamentMysqlQuery, getConnectionPool } = require('../utils/mysql-factory-db')
const router = express.Router()

router.post('/report', async (req, res) => {
  const mainPool = getConnectionPool('main')
  const conn = await mainPool.getConnection()
  try {
    const body = req.body
    const insertReportSqlQuery = 'INSERT INTO reports (reporter, bug_type, bug_detail, bug_level) VALUES (?, ?, ?, ?)';
    await preparedStamentMysqlQuery(conn, insertReportSqlQuery, [body.reporter, body.objectErrorType, body.noiDung, body.severity]);
    return res.status(200).send()
  } catch (error) {
    console.error(error)
    return res.status(500).send()
  }
})

module.exports = router
