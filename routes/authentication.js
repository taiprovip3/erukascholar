const express = require('express')
const router = express.Router()
const pool = require('../utils/db.js')
const passport = require('passport')
const jwt = require('jsonwebtoken')
const bycrypt = require('bcryptjs')
const sendEmail = require('../utils/send-mail')
const { authenticateGoogleOAuth } = require('../utils/oauth-middleware')
const hashPasswordSHA256 = require('../utils/encrypt-password.js')
const { getConnectionPool } = require('../utils/mysql-factory-db.js')

router.post('/register', async (req, res) => {
  /**
   * case01: có tồn tại username trong csdl
   *      -- username đã xác thực -> báo lỗi tài khoản exist
   *      -- chưa xác thức -> gửi link đăng ký
   * case02: không tồn tại username trong csdl -> gửi link đăng ký
   */
  try {
    const { username, email, password } = req.body
    // Kiểm tra xem username đã tồn tại trong CSDL hay chưa
    const checkMailQuery = await pool.query('SELECT * FROM authme WHERE username = $1', [username])
    if (checkMailQuery.rowCount > 0) {
      // Có tồn tại username register dưới csdl
      const sweetResponse = {
        title: `LỖI`,
        text: `Tài khoản ${username} này đã được sử dụng. Nếu bạn quên mật khẩu hãy chọn nút Quên Mật Khẩu ở hộp đăng nhập!`,
        icon: 'error',
      }
      return res.json(sweetResponse)
    } else {
      // Không tồn tại username trong csdl -> đăng ký
      const clientQuery = await pool.connect()
      const addUserQuery = await clientQuery.query(
        `INSERT INTO authme
      (id, username, realname, "password", ip, lastlogin, regdate, regip, x, y, z, world, yaw, pitch, email, islogged, hassession, totp, uuid)
      VALUES(nextval('authme_id_seq'::regclass), $1, $1, $2, '', 0, 0, '', '0'::double precision, '0'::double precision, '0'::double precision, 'world'::character varying, 0, 0, $3, '0'::smallint, '0'::smallint, '', '') RETURNING *`,
        [username, password, email],
      )
      if (addUserQuery.rowCount <= 0) {
        sweetResponse = {
          title: 'LỖI',
          text: 'ĐÃ CÓ LỖI XẢY RA KHI THÊM TÀI KHOẢN MỚI VÀO CƠ SỞ DỮ LIỆU. Vui lòng báo lỗi gấp cho Admin bằng cách dùng nút [REPORT] trên trang!',
          icon: 'error',
        }
        return res.json(sweetResponse)
      }
      clientQuery.release()
      let sweetResponse = {}
      if (email) {
        sendEmail(username, email)
        sweetResponse = {
          title: 'ĐĂNG KÝ THÀNH CÔNG',
          text: `Tài khoản của bạn đã được đăng ký vào hệ thống thành viên. Để bảo mật tài khoản và toàn vẹn chức năng. Chúng tôi khuyến khích bạn cần thêm một bước xác thực email ${email}. Vui lòng kiểm tra Gmail (hoặc mục thư spam) và nhấp vào đường dẫn bên trong để xác thực. Tránh rủi ro sau này!`,
          icon: 'success',
        }
      } else {
        sweetResponse = {
          title: 'ĐĂNG KÝ THÀNH CÔNG',
          text: 'Vui lòng đăng nhập. Tài khoản của bạn chưa thêm email xác thực nên bạn chưa thêm sử dụng đầy đủ chức năng của máy chủ cũng như rủi ro bảo mật có thể xảy ra. Chúng tôi khuyến khích bạn nên xác thực email ngay tại hộp thoại [Thông Tin Cá Nhân]',
          icon: 'success',
        }
      }
      return res.json(sweetResponse)
    }
  } catch (error) {
    console.error('Lỗi khi lưu dữ liệu vào cơ sở dữ liệu:', error)
    const sweetResponse = {
      title: 'LỖI',
      text: 'Có lỗi xảy ra khi đăng ký tài khoản!',
      icon: 'error',
    }
    return res.status(500).json(sweetResponse)
  }
})

router.get('/register/verify', async (req, res) => {
  /**
   * case 01: cố tình bug url thiếu param token
   * case 02: catch token không hợp lệ
   * 
   */
  const token = req.query.token
  if (!token) {
    const sweetResponse = {
      title: 'THIẾU TOKEN XÁC THỰC',
      text: 'Có vẽ bạn đang vô tình / cố tình gặp phải sự cố này. Chúng tôi không biết chính xác mục đích của bạn là gì nhưng đây là trang xác thực tài khoản và đã xảy ra lỗi đối với bạn. Vui lòng bấm nút quay lại để trở về trang chủ!',
      icon: 'error',
    }
    return res.render('temp-page', { sweetResponse })
  }
  try {
    const payload = jwt.verify(token, 'concavang');
    req.session.verifying = payload;
    return res.render('verify-page', { payload });
  } catch (error) {
    console.error('Lỗi khi xác thực token:', error)
    return res.status(500).send('Có lỗi xảy ra khi xác thực tài khoản.')
  }
});

router.post('/register/verify', async (req, res) => {
  /**
   * case 01: ko có session verifying
   * **** Các công việc cần làm sau khi user tạo acc
   * th01: tài khoản ko tồn tài trong hệ thống
   * th02: tài khoản đã xác thực
   * th03: email muốn xác thực đã có user nào đó dùng
   * th04: xac thuc thanh cong, đặt is_verified = true
   */
  if(!req.body.uuid || !req.body.serverName) {
    const sweetResponse = {
      title: 'THIẾU THAM SỐ',
      text: 'Đã bỏ lỡ uuid và serverName',
      icon: 'error',
    }
    return res.json(sweetResponse);
  }
  const payload = req.session.verifying;
  if(!payload) {
    const sweetResponse = {
      title: 'KHÔNG TÌM THẤY PHIÊN XÁC THỰC',
      text: 'Có vẽ bạn đang vô tình / cố tình gặp phải sự cố này. Máy chủ không thấy phiên làm việc "xác thực". Đấy là bug chăng?',
      icon: 'error',
    }
    return res.json(sweetResponse);
  }
  const clientQuery = await pool.connect()
  try {
    const username = payload.username
    const email = payload.email
    const queryResult = await pool.query('SELECT * FROM users WHERE username = $1', [username])
    if (queryResult.rowCount <= 0) {
      const sweetResponse = {
        title: 'LỖI TÀI KHOẢN KHÔNG TỒN TẠI TRONG HỆ THỐNG',
        text: `Tài khoản email ${email} không thể tìm thấy trong hệ thống chúng tôi. Có vẽ đã xảy ra bugs. Vui lòng liên hệ Admin để được hỗ trợ!`,
        icon: 'error',
      }
      return res.json(sweetResponse);
    }
    const rowQuery = queryResult.rows[0]
    const isVerified = rowQuery.is_verified
    const userUuid = rowQuery.uuid;
    if (isVerified && userUuid) {
      // TH tài khoản đã được xác thực
      const existedEmailVerified = rowQuery.email;
      const sweetResponse = {
        title: 'TÀI KHOẢN ĐÃ ĐƯỢC XÁC THỰC',
        text: `Tài khoản user ${username} đã xác thực với email mang tên ${existedEmailVerified}. Không thể xác thực lại lần nữa!`,
        icon: 'error',
      }
      return res.json(sweetResponse);
    }
    // TH email đang xác thực trùng với email đã liên kết với 1 tài khoản khác.
    const verifiedEmailUsedQuery = await clientQuery.query(
      'SELECT * FROM users WHERE email = $1 AND is_verified = TRUE',
      [email],
    )
    if (verifiedEmailUsedQuery.rowCount > 0) {
      const usernameUsedThisEmail = verifiedEmailUsedQuery.rows[0].username
      const sweetResponse = {
        title: 'XÁC THỰC THẤT BẠI',
        text: `Tài khoản gmail google ${email} đã được liên kết với một user tên là ${usernameUsedThisEmail} trước đó. Không thể đùng lại cho user của bạn!`,
        icon: 'error',
      }
      return res.json(sweetResponse);
    }
    
    const uuid = req.body.uuid;
    const serverName = req.body.serverName;

    const serverPool = await getConnectionPool(serverName);
    serverPool.getConnection(function (err, conn) {
        const playerCoinQuery = `SELECT * FROM playerpoints_points WHERE uuid = '${uuid}'`;
        conn.query(playerCoinQuery, async function (error, result) {
          if(!result) {// 
            const sweetResponse = {
              title: 'Xác thực thất bại',
              text: `Không tìm thấy UUID trong máy chủ ${serverName} của chúng tôi. Vui lòng kiểm tra lại thông tin chính xác chưa!`,
              icon: 'error'
            }
            return res.json(sweetResponse);
          }
          await clientQuery.query('UPDATE users SET email = $1, is_verified = $2, uuid = $3 WHERE username = $4', [email, true, uuid, username])
          const sweetResponse = {
            title: 'XÁC THỰC THÀNH CÔNG',
            text: `Tài khoản của bạn đã sẵn sàng. Đăng nhập ngay!`,
            icon: 'success',
          }
          return res.json(sweetResponse);
        });
        serverPool.releaseConnection(conn);
    })

  } catch (error) {
    console.error('Lỗi khi xác thực token:', error)
    return res.status(500).send('Có lỗi xảy ra khi xác thực tài khoản.')
  } finally {
    // Release the client back to the pool
    clientQuery.release()
  }
})

router.get('/oauth/google', passport.authenticate('google', { scope: ['email', 'profile'] })) // Register by google oauth

router.get(
  '/oauth/google/callback',
  passport.authenticate('google', {
    successRedirect: '/oauth/google/success',
    failureRedirect: '/oauth/google/failure',
  }),
)

router.get('/oauth/google/success', authenticateGoogleOAuth, async (req, res) => {
  const clientQuery = await pool.connect()
  try {
    const email = req.user.email
    const resultQuery = await clientQuery.query('SELECT * FROM users WHERE email = $1', [email])
    if (resultQuery.rowCount > 0) {
      const rowQuery = resultQuery.rows[0]
      const isVerified = rowQuery.is_verified
      if (isVerified) {
        // email đã xác thực -> cho login
        // là login
        const userId = rowQuery.id
        const username = rowQuery.username

        const profileQuery = await clientQuery.query('SELECT * FROM profiles WHERE users_id = $1', [userId])
        const profileRow = profileQuery.rows[0]
        const profileId = profileRow.profile_id
        const sdt = profileRow.sdt
        const country = profileRow.country
        const address = profileRow.address
        const fullname = profileRow.fullname
        const balance = profileRow.balance
        const avatar = profileRow.avatar
        const createdAt = profileRow.created_at
        const roleId = profileRow.roles_id
        const payload = {
          userId,
          username,
          email,
          isVerified,
          profileId,
          sdt,
          country,
          address,
          fullname,
          balance,
          avatar,
          createdAt,
          roleId
        }
        const token = jwt.sign(payload, 'concavang', {
          expiresIn: '1d',
        })
        res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          maxAge: 86400,
          signed: true,
        })
        return res.redirect('/dashboard')
      } else {
        // email chưa liên kết với account nào
        const sweetResponse = {
          title: 'TÀI KHOẢN GOOGLE NÀY CHƯA XÁC THỰC',
          text: `Tài khoản ${email} này chưa được xác thực bởi bất kì user nào. Đăng nhập với google chỉ hiệu quả với tài khoản đã xác thực email liên kết. Vui lòng đăng nhập bằng tên đăng nhập và mật khẩu`,
          icon: 'info',
        }
        return res.render('temp-page', { sweetResponse })
      }
    } else {
      // là register lần đầu
      const sweetResponse = {
        title: 'TÀI KHOẢN GOOGLE NÀY CHƯA ĐƯỢC ĐĂNG KÝ',
        text: `Tài khoản của bạn ${email} chưa được đăng ký. Vui lòng mở hộp thoại [Đăng Ký] tài khoản ngay!`,
        icon: 'error',
      }
      return res.render('temp-page', { sweetResponse })
    }
  } catch (error) {
    console.error('Lỗi khi lưu dữ liệu vào cơ sở dữ liệu:', error)
    const sweetResponse = {
      title: 'LỖI',
      text: error.message,
      icon: 'info',
    }
    return res.render('temp-page', { sweetResponse })
  } finally {
    clientQuery.release()
  }
})

router.get('/oauth/google/failure', (req, res) => {
  const sweetResponse = {
    title: 'LỖI',
    text: 'Somethings went wrong!',
    icon: 'error',
  }
  return res.render('temp-page', { sweetResponse })
})

router.post('/login', async (req, res) => {
  /**
   * case1: account ko tồn tại
   * case2: account sai mật khẩu
   * case3: exception
   */
  if(req.session.user) {
    const sweetResponse = {
      title: 'BẠN ĐÃ ĐĂNG NHẬP',
      text: `Tài khoản đang được sử dụng`,
      icon: 'error',
    }
    return res.json(sweetResponse);
  }
  const clientQuery = await pool.connect()
  try {
    const { username, password, is_remember } = req.body
    const queryUser = await clientQuery.query(
      'SELECT users.*, profiles.* FROM users INNER JOIN profiles ON users.id = profiles.users_id WHERE users.username = $1',
      [username],
    )
    if (queryUser.rowCount <= 0) {
      const sweetResponse = {
        title: 'TÀI KHOẢN KHÔNG TỒN TẠI',
        text: `Tài khoản user ${username} này chưa được đăng ký`,
        icon: 'error',
      }
      return res.json(sweetResponse)
    }
    const storedPassword = queryUser.rows[0].password
    const match = storedPassword.match(/\$SHA\$(.*?)\$/)
    const salt = match[1]
    const userPasswordHash1 = hashPasswordSHA256(password)
    const userPasswordHash2 = hashPasswordSHA256(userPasswordHash1 + salt)
    const userPasswordHash = `$SHA$${salt}$${userPasswordHash2}`

    if (userPasswordHash !== storedPassword) {
      const sweetResponse = {
        title: 'SAI MẬT KHẨU',
        text: 'Mật khẩu không đúng',
        icon: 'error',
      }
      return res.json(sweetResponse)
    }

    const rows = queryUser.rows
    const row = rows[0]
    const userId = row.id
    const email = row.email
    const isVerified = row.is_verified
    const profileId = row.profile_id
    const sdt = row.sdt
    const country = row.country
    const address = row.address
    const fullname = row.fullname
    const balance = row.balance
    const avatar = row.avatar
    const createdAt = row.created_at
    const roleId = row.roles_id

    const payload = {
      userId,
      username,
      email,
      isVerified,
      profileId,
      sdt,
      country,
      address,
      fullname,
      balance,
      avatar,
      createdAt,
      roleId
    }
    const token = jwt.sign(payload, 'concavang', { expiresIn: '1d' })
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      maxAge: 86400,
      signed: true,
    })
    const sweetResponse = {
      title: 'ĐĂNG NHẬP THÀNH CÔNG',
      text: 'Chúng tôi sẽ điều hướng bạn trong giây lát!',
      icon: 'success',
    }
    return res.json(sweetResponse)
  } catch (error) {
    console.log('error=', error.message)
    return res.status(500).send('Có lỗi xảy ra khi xác thực tài khoản.')
  } finally {
    clientQuery.release()
  }
})

router.get('/logout', (req, res) => {
  req.session.user = ''
  req.session.destroy()
  res.clearCookie('token')
  return res.redirect('/')
})

module.exports = router
