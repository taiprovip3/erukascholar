const express = require('express');
const pool = require('../utils/db');
const { default: axios } = require('axios');
const router = express.Router();
const helper = require('../utils/calculate-timestamp');
const { getConnectionPool, mysqlQuery } = require('../utils/mysql-factory-db');

router.get('/instruct/download', async (req, res) => {
  const userData = req.session.user
  let payload = { userData }
  // get mysql connection
  const mainPool = getConnectionPool('main')
  const conn = await mainPool.getConnection()
  try {
    const serverMetricsSqlQuery = 'SELECT * FROM server_metrics';
    const serverMetricsResult = await mysqlQuery(conn, serverMetricsSqlQuery);
    const serverMetrics = serverMetricsResult[0]
    payload['serverMetrics'] = serverMetrics

    const membersSqlQuery = 'SELECT COUNT(*) as TOTAL FROM users WHERE is_verified = TRUE';
    const membersResult = await mysqlQuery(conn, membersSqlQuery);
    const members = membersResult[0].TOTAL
    const serverUrl = `https://api.mcstatus.io/v2/status/java/${process.env.SERVER_IPV4}:${process.env.SERVER_PORT}`
    const serverStatusResponse = await axios.get(serverUrl)
    const onlinePlayers = serverStatusResponse.data.players.online
    const maxPlayers = serverStatusResponse.data.players.max
    const serverStatus = { onlinePlayers, maxPlayers, members }
    payload['serverStatus'] = serverStatus

    const titleSqlQuery = 'SELECT title FROM posts ORDER BY created_at DESC'
    const titlesResult = await mysqlQuery(conn, titleSqlQuery)
    const titles = titlesResult[0]
    let eventTitles = []
    if(titles) {
      eventTitles = titles.map((e) => {
        return e.title
      })
    }
    payload['eventTitles'] = eventTitles
    return res.render('instruct-download', { payload, helper })
  } catch (error) {
    console.error('error=', error);
  } finally {
    conn.release();
  }
});

router.get('/instruct/recharge', async (req, res) => {
  const userData = req.session.user
  let payload = { userData }
  // get mysql connection
  const mainPool = getConnectionPool('main')
  const conn = await mainPool.getConnection()
  try {
    const serverMetricsSqlQuery = 'SELECT * FROM server_metrics';
    const serverMetricsResult = await mysqlQuery(conn, serverMetricsSqlQuery);
    const serverMetrics = serverMetricsResult[0]
    payload['serverMetrics'] = serverMetrics

    const membersSqlQuery = 'SELECT COUNT(*) as TOTAL FROM users WHERE is_verified = TRUE';
    const membersResult = await mysqlQuery(conn, membersSqlQuery);
    const members = membersResult[0].TOTAL
    const serverUrl = `https://api.mcstatus.io/v2/status/java/${process.env.SERVER_IPV4}:${process.env.SERVER_PORT}`
    const serverStatusResponse = await axios.get(serverUrl)
    const onlinePlayers = serverStatusResponse.data.players.online
    const maxPlayers = serverStatusResponse.data.players.max
    const serverStatus = { onlinePlayers, maxPlayers, members }
    payload['serverStatus'] = serverStatus

    const titleSqlQuery = 'SELECT title FROM posts ORDER BY created_at DESC'
    const titlesResult = await mysqlQuery(conn, titleSqlQuery)
    const titles = titlesResult[0]
    let eventTitles = []
    if(titles) {
      eventTitles = titles.map((e) => {
        return e.title
      })
    }
    payload['eventTitles'] = eventTitles
    return res.render('instruct-recharge', { payload, helper })
  } catch (error) {
    console.error('error=', error);
  } finally {
    conn.release();
  }
});

module.exports = router;