const { default: axios } = require('axios')
const express = require('express')
const helper = require('../utils/calculate-timestamp')
const { authenticateToken } = require('../utils/oauth-middleware')
const { preparedStamentMysqlQuery, getConnectionPool, mysqlQuery } = require('../utils/mysql-factory-db')
const router = express.Router()

router.get('/postings', async (req, res) => {
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

    const membersSqlQuery = 'SELECT COUNT(*) as TOTAL FROM users';
    const membersResult = await mysqlQuery(conn, membersSqlQuery);
    const members = membersResult[0].TOTAL
    const serverUrl = `https://api.mcstatus.io/v2/status/java/${process.env.SERVER_IPV4}:${process.env.SERVER_PORT}`
    const serverStatusResponse = await axios.get(serverUrl)
    const onlinePlayers = serverStatusResponse.data.players.online
    const maxPlayers = serverStatusResponse.data.players.max
    const serverStatus = { onlinePlayers, maxPlayers, members }
    payload['serverStatus'] = serverStatus

    const titlesSqlQuery = 'SELECT title FROM posts ORDER BY created_at DESC'
    const titlesResult = await mysqlQuery(conn, titlesSqlQuery)
    let eventTitles = []
    if(titlesResult.length > 0) {
      eventTitles = titlesResult.map((e) => {
        return e.title
      })
    }
    payload['eventTitles'] = eventTitles
    // posts
    const postsSqlQuery = 'SELECT * FROM posts ORDER BY post_id DESC';
    const posts = await mysqlQuery(conn, postsSqlQuery);
    payload['posts'] = posts
    return res.render('postings', { payload, helper })
  } catch (error) {
    console.error('error=', error);
  } finally {
    conn.release();
  }
})

router.post('/postings', authenticateToken, async (req, res) => {
  const { title, content } = req.body
  if (!title) {
    const sweetResponse = {
      title: 'LỖI',
      text: 'Thiếu tiêu đề bài viết',
      icon: 'error',
    }
    return res.json(sweetResponse)
  }
  const mainPool = getConnectionPool('main')
  const conn = await mainPool.getConnection()
  try {
    const userId = req.session.user.userId
    const insertPostSqlQuery = 'INSERT INTO posts (title, content, users_id) VALUES (?, ?, ?)';
    const insertPostResult = await preparedStamentMysqlQuery(conn, insertPostSqlQuery, [title, content, userId]);
    console.log('Testings post post=', insertPostResult);
    const sweetResponse = {
      title: 'ĐĂNG TẢI THÀNH CÔNG',
      text: 'Nếu không nhìn thấy bài viết sự kiện mới, vui lòng bấm TẢI LẠI trang bằng ctrl + R nhé',
      icon: 'success',
    }
    return res.json(sweetResponse)
  } catch (error) {
    console.error('/posting error=', error)
    return res.status(500).send('Internal Server Error')
  } finally {
    conn.release();
  }
})

module.exports = router
