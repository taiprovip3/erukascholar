const express = require('express');
const { authenticateToken } = require('../utils/oauth-middleware');
const { default: axios } = require('axios');
const pool = require('../utils/db');
const { getConnectionPool } = require('../utils/mysql-factory-db');
const router = express.Router();
require('dotenv').config()
const minecraftPlayer = require("minecraft-player");

router.get('/servers', async (req, res) => {
    const serversString = process.env.SERVER_TYPES;
    const serversArray = serversString.split(',');
    console.log('serversarray=', serversArray);
    return res.status(200).json(serversArray);
});

router.get('/servers/getPlayerCoins', authenticateToken, async (req, res) => {
    const serverName = req.query.server;
    if(!serverName) {
        return res.status(500).send('No server name params found');
    }
    const clientQuery = await pool.connect();
    try {
        const username = req.session.user.username;
        // const uuidQuery = await clientQuery.query('SELECT uuid FROM authme WHERE username = $1', [username]);
        // const uuid = uuidQuery.rows[0].uuid;
        const { uuid } = await minecraftPlayer(username);
        console.log('uuid=', uuid);

        const serverPool = await getConnectionPool(serverName);
        serverPool.getConnection(function (err, conn) {
            const playerCoinQuery = `SELECT points FROM playerpoints_points WHERE uuid = ${uuid}`;
            conn.query(playerCoinQuery, function (error, result) {
                console.log('result=', result);
            });
            poolMysql.releaseConnection(conn);
        })
    } catch (error) {
        console.error('/servers/getPlayerCoins error', error);
        return res.status(500).send(error);
    } finally {
        clientQuery.release();
    }
});

module.exports = router;