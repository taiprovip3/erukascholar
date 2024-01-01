const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../utils/oauth-middleware')
const sendEmail = require('../utils/send-mail')
const NodeCache = require('node-cache')
const temporaryResentMailCache = new NodeCache({ stdTTL: 60 })
const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })
const minioClient = require('../utils/minio-client')
const Transaction = require('../models/transaction')
const { getConnectionPool, preparedStamentMysqlQuery, mysqlTransaction } = require('../utils/mysql-factory-db')

router.put('/profile/update', authenticateToken, async (req, res) => {
  /**
   * 01. thêm mới hoặc cập nhật cho bảng profiles
   * 02. cập nhật lại payload cho req.session.user
   */
  const mainPool = getConnectionPool('main')
  const conn = await mainPool.getConnection()
  try {
    const data = req.body

    const fullname = data.fullname
    const sdt = data.sdt
    const country = data.country
    const address = data.address

    const payload = req.session.user
    const userId = payload.userId

    const updateProfileSqlQuery = 'UPDATE profiles SET fullname = ?, sdt = ?, country = ?, address = ? WHERE users_id = ?';
    await preparedStamentMysqlQuery(conn, updateProfileSqlQuery, [fullname, sdt, country, address, userId]);

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
    conn.release()
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
  const mainPool = getConnectionPool('main')
  const conn = await mainPool.getConnection()
  try {
    const { email } = req.body
    const isEmailUsedSqlQuery = 'SELECT * FROM users WHERE email = ? AND is_verified = TRUE';
    const isEmailUsedResult = await preparedStamentMysqlQuery(conn, isEmailUsedSqlQuery, [email]);
    if (isEmailUsedResult.length > 0) {
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
    conn.release()
  }
})

router.post('/profile/upload-avatar', upload.single('avatar'), authenticateToken, async (req, res) => {
  let imageUrl = ''
  const mainPool = getConnectionPool('main')
  const conn = await mainPool.getConnection()
  try {
    const file = req.file
    const userId = req.session.user.userId
    const metaData = {
      'Content-Type': file.mimetype,
    }
    const objectName = `${userId}-${Date.now()}-${file.originalname}`
    await minioClient.putObject('avatar', objectName, file.buffer, metaData)
    imageUrl =
      minioClient.protocol + '://' + minioClient.host + ':' + minioClient.port + '/' + 'avatar' + '/' + objectName
    const updateAvatarSqlQuery = 'UPDATE profiles SET avatar = ? WHERE users_id = ?';
    const updateAvatarResult = await preparedStamentMysqlQuery(conn, updateAvatarSqlQuery, [objectName, userId]);
  } catch (error) {
    console.error('error=', error)
    return res.status(500).send(error)
  } finally {
    conn.release()
  }

  try {
    const oldObjectName = req.session.user.avatar
    await minioClient.removeObject('avatar', oldObjectName)
  } catch (error) {
    // Lỗi xóa image minio ko tồn tại cũng ko cần làm gì
  } finally {
    return res.status(200).send(imageUrl)
  }
})

router.get('/profile/avatar', authenticateToken, async (req, res) => {
  const mainPool = getConnectionPool('main')
  const conn = await mainPool.getConnection()
  try {
    const userId = req.session.user.userId
    const getAvatarSqlQuery = 'SELECT avatar FROM profiles WHERE users_id = ?';
    const getAvatarResult = await preparedStamentMysqlQuery(conn, getAvatarSqlQuery, [userId]);
    const objectName = getAvatarResult[0].avatar
    const dataStream = await minioClient.getObject('avatar', objectName)
    res.setHeader('Content-Type', 'image/jpeg')
    dataStream.pipe(res)
  } catch (error) {
    console.error('error=', error)
    return res.status(500).send(error)
  } finally {
    conn.release()
  }
})

router.get('/history', authenticateToken, async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ created_at: -1 });
    return res.json(transactions)
  } catch (error) {
    console.error('/history error=', error)
    return res.status(500).send(error)
  }
})

router.post('/checkin', authenticateToken, async (req, res) => {
  const mainPool = getConnectionPool('main')
  const conn = await mainPool.getConnection()
  try {
    const userId = req.session.user.userId;
    const validateCheckinSqlQuery = 'SELECT * FROM checkins WHERE users_id = ? AND DATE(checkin_date) = CURRENT_DATE';
    const validateCheckinResult = await preparedStamentMysqlQuery(conn, validateCheckinSqlQuery, [userId]);
    if (validateCheckinResult.length > 0) {
      // Đã điểm danh hôm nay
      const sweetReponse = { title: 'ĐÃ ĐIỂM DANH', text: 'Hôm nay đã điểm danh rồi :(', icon: 'error' };
      return res.json(sweetReponse);
    }
    // Đã tồn tại nhưng ngày bé hơn hoặc ko tồn tại
    const queries = [
      { sql: `
          INSERT INTO checkins (users_id, checkin_count, checkin_date)
          VALUES (?, 1, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE
          checkin_count = checkin_count + 1, checkin_date = CURRENT_TIMESTAMP;
        `, params: [userId] },
      { sql: 'UPDATE profiles SET balance = balance + 1 WHERE users_id = ?', params: [userId] },
    ]
    const resultTransaction = await mysqlTransaction(conn, queries);
    if(!resultTransaction) {
      return res.status(500).send('Update Transaction checkin was internal server error!');
    }
    const sweetReponse = {title: 'THÀNH CÔNG', text: 'Xin chúc mừng bạn nhận được 1🥮 hôm nay.', icon: 'success'};
    return res.json(sweetReponse);
  } catch (error) {
    console.error('/checkin error=', error)
    return res.status(500).send(error)
  } finally {
    conn.release()
  }
});

router.get('/inventory', authenticateToken, async (req, res) => {
  const mainPool = getConnectionPool('main')
  const conn = await mainPool.getConnection()
  try {
    const userId = req.session.user.userId;
    const userFilesSqlQuery = 'SELECT * FROM users_files uf INNER JOIN files f ON uf.files_id = f.file_id WHERE users_id = ?';
    const userFilesResult = await preparedStamentMysqlQuery(conn, userFilesSqlQuery, [userId]);
    if(userFilesResult.length <= 0) {
      return res.json([]);
    }
    return res.json(userFilesResult);
  } catch (error) {
    console.error('/inventory error=', error)
    return res.status(500).send(error)
  } finally {
    conn.release()
  }
});

module.exports = router
