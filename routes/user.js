const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { authenticateToken } = require('../utils/oauth-middleware');

router.put('/profile/update', authenticateToken, async (req, res) => {
    /**
     * 01. thêm mới hoặc cập nhật cho bảng profiles
     * 02. cập nhật lại payload cho req.session.user
     */
    try {
        const data = req.body;

        const fullname = data.fullname;
        const sdt = data.sdt;
        const country = data.country;
        const address = data.address;

        const payload = req.session.user;
        const userId = payload.userId;

        await pool.query('INSERT INTO profiles (users_id, fullname, sdt, country, address) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (users_id) DO UPDATE SET fullname = $2, sdt = $3, country = $4, address = $5', [userId, fullname, sdt, country, address]);

        const newPayload = { ...payload, sdt, country, address, fullname };

        req.session.user = newPayload;

        const sweetReponse = {
            title: 'CẬP NHẬT THÀNH CÔNG',
            text: 'THÔNG TIN CÁ NHÂN',
            icon: 'success'
        };
        return res.json(sweetReponse);

    } catch (error) {
        console.error('/profile/update=', error);
        return res.status(500).send(error);
    }
});

module.exports = router;