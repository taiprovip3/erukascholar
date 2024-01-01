const jwt = require('jsonwebtoken')
const pool = require('./db')
const { preparedStamentMysqlQuery, getConnectionPool } = require('./mysql-factory-db')

function authenticateGoogleOAuth(req, res, next) {
  if (req.user) {
    return next()
  }
  return res.redirect('/auth')
}

async function authenticateToken(req, res, next) {
  /**
   * 01. kiểm tra coi có payload user trong req.session hay chưa. Nếu có thì đã login rồi -> pass nex();
   * 02. nếu không có payload thì kiểm tra cookie.
   */
  if (req.session.user) {
    return next()
  }
  const mainPool = getConnectionPool('main')
  const conn = await mainPool.getConnection()
  try {
    const token = req.signedCookies.token
    const payload = jwt.verify(token, 'concavang')
    const userId = payload.userId
    const getProfileSqlQuery = 'SELECT * FROM profiles WHERE users_id = ?';
    const getProfileResult = await preparedStamentMysqlQuery(conn, getProfileSqlQuery, [userId]);

    const profileRow = getProfileResult[0]
    const fullname = profileRow.fullname
    const sdt = profileRow.sdt
    const country = profileRow.country
    const address = profileRow.address
    const balance = profileRow.balance
    const avatar = profileRow.avatar
    const profileId = profileRow.profile_id
    const newPayload = { ...payload, fullname, sdt, country, address, balance, avatar, profileId }
    req.session.user = newPayload
    return next()
  } catch (error) {
    console.error('authenticateToken error=', error)
    res.clearCookie('token')
    // return res.redirect('/auth')
    return res.status(500).send('Lỗi tài khoản đăng nhập');
  } finally {
    conn.release();
  }
}

module.exports = {
  authenticateGoogleOAuth,
  authenticateToken,
}
