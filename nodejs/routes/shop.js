const express = require('express');
const { default: axios } = require('axios');
const router = express.Router();
const helper = require('../utils/calculate-timestamp');
const { authenticateToken } = require('../utils/oauth-middleware');
const updateUserSession = require('../utils/update-session');
const { mysqlQuery, getConnectionPool, preparedStamentMysqlQuery, mysqlTransaction } = require('../utils/mysql-factory-db');

router.get('/shop', async (req, res) => {
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
    return res.render('shop', { payload, helper })
  } catch (error) {
    console.error('error=', error);
  } finally {
    conn.release();
  }
});

router.get('/shop/files', async (req, res) => {
  const mainPool = getConnectionPool('main')
  const conn = await mainPool.getConnection()
  try {
    const filesSqlQuery = 'SELECT f.*, u.* FROM files f INNER JOIN users u ON f.author = u.id ORDER BY f.file_id';
    const filesResult = await mysqlQuery(conn, filesSqlQuery);
    return res.json(filesResult);
  } catch (error) {
    console.error('/shop/files error=', error);
    return res.status(500).send(error);
  } finally {
    conn.release();
  }
});

router.get('/shop/files/:fileId', async (req, res) => {
  const  { fileId } = req.params;
  if(!fileId) {
    return res.status(500).send('No fileId found!');
  }
  const mainPool = getConnectionPool('main')
  const conn = await mainPool.getConnection()
  try {
    const fileSqlQuery = 'SELECT f.*, df.* FROM files f INNER JOIN detail_file df ON f.file_id = df.file_id WHERE f.file_id = ?';
    const fileResult = await preparedStamentMysqlQuery(conn, fileSqlQuery, [fileId]);
    if(fileResult.length <= 0) {
      return res.json({});
    }
    const fileResultData = fileResult[0];
    return res.json(fileResultData);
  } catch (error) {
    console.error('/shop/files/:fileId error=', error);
    return res.status(500).send(error);
  } finally {
    conn.release();
  }
});

router.put('/shop/buy-file', authenticateToken, async (req, res) => {
  /**
   * case 01: bug fileId
   * case 02: ko đủ tiền mua
   * ** Cho mua trùng file
   */
  const mainPool = getConnectionPool('main')
  const conn = await mainPool.getConnection()
  try {
    const { fileId } = req.body;
    const fileSqlQuery = 'SELECT * FROM files WHERE file_id = ?';
    const fileResult = await preparedStamentMysqlQuery(conn, fileSqlQuery, [fileId]);

    if(fileResult.length <= 0) {
      return res.status(500).send('No fileId found. Are you trying to bug somethings?');
    }
    const fileData = fileResult[0];
    const filePrice = Number(fileData.price);
    const userId = req.session.user.userId;
    const userBalanceSqlQuery = 'SELECT balance FROM profiles WHERE users_id = ?';
    const userBalanceResult = await preparedStamentMysqlQuery(conn, userBalanceSqlQuery, [userId]);
    const userBalance = Number(userBalanceResult[0].balance);
    if(userBalance < filePrice) {
      const sweetResponse = { title: 'Lỗi', text: 'Bạn không có đủ xu để mua gói tài nguyên. Vui lòng kiếm thêm', icon: 'error' };
      return res.json(sweetResponse);
    }
    // Tiến hành mua
    const queries = [
      { sql: 'UPDATE files SET counter = counter + 1 WHERE file_id = ?', params: [fileId] },
      { sql: 'UPDATE profiles SET balance = balance - ? WHERE users_id = ?', params: [filePrice, userId] },
      { sql: 'INSERT INTO users_files (users_id, files_id) VALUES (?, ?)', params: [userId, fileId] },
    ]
    const transactionResult = await mysqlTransaction(conn, queries);
    if(!transactionResult) {
      return res.status(500).send('Update transaction buy file failed. Internal server error');
    }
    // Cập nhật session
    const updateObject = { balance: userBalance - filePrice };
    updateUserSession(req, updateObject);
    const sweetResponse = { title: 'GIAO DỊCH THÀNH CÔNG', text: 'Tài nguyên đã được thêm vào túi của bạn', icon: 'success' };
    return res.json(sweetResponse);
  } catch (error) {
    console.error('/shop/buy-file error=', error);
    return res.status(500).send(error);
  } finally {
    conn.release();
  }
});

module.exports = router;