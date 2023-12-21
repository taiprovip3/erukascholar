const express = require('express');
const pool = require('../utils/db');
const { default: axios } = require('axios');
const router = express.Router();
const helper = require('../utils/calculate-timestamp');
const { authenticateToken } = require('../utils/oauth-middleware');
const updateUserSession = require('../utils/update-session');

router.get('/shop', async (req, res) => {
  const userData = req.session.user
  let payload = { userData }
  const queryResult = await pool.query('SELECT * FROM server_metrics')
  const queryRow = queryResult.rows[0]
  // serverMetrics
  payload['serverMetrics'] = queryRow
  // serverStatus
  const queryMembersResult = await pool.query('SELECT COUNT(*) FROM users WHERE is_verified = TRUE')
  const members = queryMembersResult.rows[0].count
  const serverStatusResponse = await axios.get('https://api.mcstatus.io/v2/status/java/play.hypixel.net:25565')
  const onlinePlayers = serverStatusResponse.data.players.online
  const maxPlayers = serverStatusResponse.data.players.max
  const serverStatus = { onlinePlayers, maxPlayers, members }
  payload['serverStatus'] = serverStatus
  const queryTitlesResult = await pool.query('SELECT title FROM posts ORDER BY created_at DESC')
  const tiles = queryTitlesResult.rows
  const eventTitles = tiles.map((e) => {
    return e.title
  })
  payload['eventTitles'] = eventTitles
  // posts
  const queryPostsResult = await pool.query('SELECT * FROM posts ORDER BY post_id DESC')
  const posts = queryPostsResult.rows
  payload['posts'] = posts
  // method caltimeago
  return res.render('shop', { payload, helper })
});

router.get('/shop/files', async (req, res) => {
  const clientQuery = await pool.connect();
  try {
    const filesQuery = await clientQuery.query('SELECT f.*, u.* FROM files f INNER JOIN users u ON f.author = u.id ORDER BY f.file_id');
    const filesResult = filesQuery.rows;
    return res.json(filesResult);
  } catch (error) {
    console.error('/shop/files error=', error);
    return res.status(500).send(error);
  } finally {
    clientQuery.release();
  }
});

router.get('/shop/files/:fileId', async (req, res) => {
  const  { fileId } = req.params;
  if(!fileId) {
    return res.status(500).send('No fileId found!');
  }
  const clientQuery = await pool.connect();
  try {
    const fileQuery = await clientQuery.query('SELECT f.*, df.* FROM files f INNER JOIN detail_file df ON f.file_id = df.file_id WHERE f.file_id = $1', [fileId]);
    if(fileQuery.rowCount <= 0) {
      return res.json({});
    }
    const fileResult = fileQuery.rows[0];
    return res.json(fileResult);
  } catch (error) {
    console.error('/shop/files/:fileId error=', error);
    return res.status(500).send(error);
  } finally {
    clientQuery.release();
  }
});

router.put('/shop/buy-file', authenticateToken, async (req, res) => {
  /**
   * case 01: bug fileId
   * case 02: ko đủ tiền mua
   * ** Cho mua trùng file
   */
  const clientQuery = await pool.connect();
  try {
    const { fileId } = req.body;
    const fileQuery = await clientQuery.query('SELECT * FROM files WHERE file_id = $1', [fileId]);
    if(fileQuery.rowCount <= 0) {
      return res.status(500).send('No fileId found. Are you trying to bug somethings?');
    }
    const fileData = fileQuery.rows[0];
    const filePrice = Number(fileData.price);
    const userId = req.session.user.userId;
    const userBalanceQuery = await clientQuery.query('SELECT balance FROM profiles WHERE users_id = $1', [userId]);
    const userBalance = Number(userBalanceQuery.rows[0].balance);
    if(userBalance < filePrice) {
      const sweetResponse = { title: 'Lỗi', text: 'Bạn không có đủ xu để mua gói tài nguyên. Vui lòng kiếm thêm', icon: 'error' };
      return res.json(sweetResponse);
    }
    // Tiến hành mua
    await clientQuery.query('BEGIN');
    await clientQuery.query('UPDATE files SET counter = counter + 1 WHERE file_id = $1', [fileId]);
    await clientQuery.query('UPDATE profiles SET balance = balance - $1 WHERE users_id = $2', [filePrice, userId]);
    await clientQuery.query('INSERT INTO users_files (users_id, files_id) VALUES ($1, $2)', [userId, fileId]);
    await clientQuery.query('COMMIT');
    // Cập nhật session
    const updateObject = { balance: userBalance - filePrice };
    updateUserSession(req, updateObject);
    const sweetResponse = { title: 'GIAO DỊCH THÀNH CÔNG', text: 'Tài nguyên đã được thêm vào túi của bạn', icon: 'success' };
    return res.json(sweetResponse);
  } catch (error) {
    clientQuery.query('ROLLBACK');
    console.error('/shop/buy-file error=', error);
    return res.status(500).send(error);
  } finally {
    clientQuery.release();
  }
});

module.exports = router;