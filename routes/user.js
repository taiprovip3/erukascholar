const express = require('express')
const router = express.Router()
const pool = require('../utils/db')
const { authenticateToken } = require('../utils/oauth-middleware')
const sendEmail = require('../utils/send-mail')
const NodeCache = require('node-cache')
const temporaryResentMailCache = new NodeCache({ stdTTL: 60 });
const multer = require('multer');
const upload = multer();

router.put('/profile/update', authenticateToken, async (req, res) => {
  /**
   * 01. thêm mới hoặc cập nhật cho bảng profiles
   * 02. cập nhật lại payload cho req.session.user
   */
  const clientQuery = await pool.connect()
  try {
    const data = req.body

    const fullname = data.fullname
    const sdt = data.sdt
    const country = data.country
    const address = data.address

    const payload = req.session.user
    const userId = payload.userId

    await clientQuery.query(
      'UPDATE profiles SET fullname = $1, sdt = $2, country = $3, address = $4 WHERE users_id = $5',
      [fullname, sdt, country, address, userId],
    )

    const newPayload = { ...payload, sdt, country, address, fullname }

    req.session.user = newPayload

    const sweetReponse = {
      title: 'CẬP NHẬT THÀNH CÔNG',
      text: 'THÔNG TIN CÁ NHÂN',
      icon: 'success',
    }
    return res.json(sweetReponse)
  } catch (error) {
    console.error('/profile/update=', error)
    return res.status(500).send(error)
  } finally {
    clientQuery.release()
  }
})

router.post('/profile/verify', authenticateToken, async (req, res) => {
  const emailKeySession = req.session.email
  if (emailKeySession && temporaryResentMailCache.get(emailKeySession)) {
    const sweetReponse = {
      title: 'VUI LÒNG KHÔNG SPAM',
      text: 'Vui lòng chờ trong giây lát để thực hiện lại thao tác.',
      icon: 'warning',
    }
    return res.json(sweetReponse)
  }
  const clientQuery = await pool.connect()
  try {
    const { email } = req.body
    const isEmailUsedQuery = await clientQuery.query('SELECT * FROM users WHERE email = $1 AND is_verified = TRUE', [
      email,
    ])
    if (isEmailUsedQuery.rowCount > 0) {
      // Đã có người dùng email này
      const sweetReponse = {
        title: 'EMAIL NÀY ĐÃ CÓ NGƯỜI SỬ DỤNG',
        text: 'Email này đã được xác thực và sở hữu bởi người khác trong hệ thống của chúng tôi. Vui lòng xác thực email khác.',
        icon: 'error',
      }
      return res.json(sweetReponse)
    }
    const userData = req.session.user
    const username = userData.username
    sendEmail(username, email)
    req.session.email = email
    temporaryResentMailCache.set(req.session.email, true, 60)
    const sweetReponse = {
      title: 'ĐÃ GỬI LINK XÁC THỰC TỚI EMAIL',
      text: 'Vui lòng kiểm tra hộp thư Gmail hoặc Email của bạn. Nhấp vào đường liên kết bên trong. Nếu không có trong hộp thư, vui lòng kiểm tra mục [Spam thư rác].',
      icon: 'info',
    }
    return res.json(sweetReponse)
  } catch (error) {
    console.error('/profile/verify error=', error)
    return res.status(500).send(error)
  } finally {
    clientQuery.release()
  }
});

router.post('/profile/upload-avatar', upload.single('avatar'), authenticateToken, async (req, res) => {
  const clientQuery = await pool.connect();
  try {
    const userId = req.session.user.userId;
    const base64Image = req.body.avatar;
    const imageBuffer = Buffer.from(base64Image, 'base64');
    const avatarPath = `data:image/png;base64,${base64Image}`;

    await clientQuery.query('UPDATE profiles SET avatar = $1 WHERE users_id = $2', [avatarPath, userId]);
    return res.send(avatarPath);
  } catch (error) {
    console.log('error=', error );
    return res.status(500).send(error);
  }
});

module.exports = router
