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
        const uuidQuery = await clientQuery.query('SELECT uuid FROM users WHERE username = $1', [username]);
        const uuid = uuidQuery.rows[0].uuid;
        console.log('uuid=', uuid);

        const serverPool = await getConnectionPool(serverName);
        serverPool.getConnection(function (err, conn) {
            if(err) {
                console.error('error=', err);
            }
            const playerCoinQuery = `SELECT points FROM playerpoints_points WHERE uuid = ?`;
            conn.query(playerCoinQuery, [uuid], function (error, result) {
                if(!result) {
                    return res.status(500).send(`not found user ${username} with uuid ${uuid}`);
                }
                const playerStatResponse = {
                    username,
                    uuid,
                    coins: result[0].points
                }
                return res.status(200).json(playerStatResponse);
            });
            serverPool.releaseConnection(conn);
        })
    } catch (error) {
        console.error('/servers/getPlayerCoins error', error);
        return res.status(500).send(error);
    } finally {
        clientQuery.release();
    }
});

module.exports = router;