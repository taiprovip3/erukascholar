const { default: axios } = require('axios');
const express = require('express');
const pool = require('../utils/db');
const calculateTimeAgo = require('../utils/calculate-time-ago');
const router = express.Router();

router.get('/postings', async (req, res) => {
    const queryResult = await pool.query('SELECT * FROM server_metrics');
    const queryRow = queryResult.rows[0];
    // serverMetrics
    let payload = { serverMetrics: queryRow };
    // serverStatus
    const serverStatusResponse = await axios.get('https://api.mcstatus.io/v2/status/java/play.hypixel.net:25565');
    const onlinePlayers = serverStatusResponse.data.players.online;
    const maxPlayers = serverStatusResponse.data.players.max; 
    const serverStatus = { onlinePlayers, maxPlayers };
    payload['serverStatus'] = serverStatus;
    // posts
    const queryPostsResult = await pool.query('SELECT * FROM posts ORDER BY post_id DESC');
    const posts = queryPostsResult.rows;
    payload['posts'] = posts;
    // method caltimeago
    return res.render('postings', { payload, helper: calculateTimeAgo  });
});

router.post('/postings', async (req, res) => {
    try {
        console.log('req.body=', req.body);
        // if(!req.body || !req.body.author) {
        //     throw new Error('No author session found!');
        // }
        const { author, title, content } = req.body;
        const result = await pool.query(
          'INSERT INTO posts (title, content, users_id) VALUES ($1, $2, $3) RETURNING *',
          [title, content, 13]
        );
    
        console.log('Post added:', result.rows[0]);
        const sweetResponse = {
          title: 'ĐĂNG TẢI THÀNH CÔNG',
          text: 'Nếu không nhìn thấy bài viết sự kiện mới, vui lòng bấm TẢI LẠI trang bằng ctrl + R nhé',
          icon: 'success'
        };
        return res.json(sweetResponse);
      } catch (error) {
        console.error('/posting error=', error);
        return res.status(500).send('Internal Server Error');
      }
});

router.get('/status-hyx', async (req, res) => {
    const response = await axios.get('https://api.mcstatus.io/v2/status/java/play.hypixel.net:25565');
    console.log('response=',response.data);
});

module.exports = router;