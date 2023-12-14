const express = require('express');
const pool = require('../utils/db');
const { default: axios } = require('axios');
const router = express.Router();
const helper = require('../utils/calculate-timestamp');

router.get('/instruct/download', async (req, res) => {
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
  return res.render('instruct-download', { payload, helper })
});

module.exports = router;