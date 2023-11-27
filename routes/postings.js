const { default: axios } = require('axios');
const express = require('express');
const pool = require('../utils/db');
const router = express.Router();

router.get('/postings', async (req, res) => {
    const queryResult = await pool.query('SELECT * FROM server_metrics');
    const queryRow = queryResult.rows[0];
    const payload = { serverMetrics: queryRow };
    return res.render('postings', { payload });
});

router.get('/status-hyx', async (req, res) => {
    const response = await axios.get('https://api.mcstatus.io/v2/status/java/play.hypixel.net:25565');
    console.log('response=',response.data);
});

module.exports = router;