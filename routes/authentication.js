const express = require('express')
const router = express.Router()
const pool = require('../utils/db.js')
const passport = require('passport')
const jwt = require('jsonwebtoken')
const bycrypt = require('bcryptjs')
const sendEmail = require('../utils/send-mail')
const { authenticateGoogleOAuth } = require('../utils/oauth-middleware')

router.post('/register/email', async (req, res) => {
  /**
   * case1: có tồn tại email trong csdl
   *      -- email đã xác thực -> báo lỗi tài khoản exist
   *      -- chưa xác thức -> gửi link đăng ký
   * case2: không tồn tại email trong csdl -> gửi link đăng ký
   */
  try {
    const { email, password } = req.body
    // Kiểm tra xem email đã tồn tại trong CSDL hay chưa
    const checkMailQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    if (checkMailQuery.rowCount > 0) {
      // Có tồn tại email register dưới csdl
      const isEmailVerified = checkMailQuery.rows[0].is_verified
      if (isEmailVerified) {
        // Email đã xác thực -> báo lỗi tài khoản exist
        const sweetResponse = {
          title: `LỖI`,
          text: `Tài khoản email ${email} này đã được sử dụng. Nếu bạn quên mật khẩu hãy chọn nút Quên Mật Khẩu ở hộp đăng nhập!`,
          icon: 'error',
        }
        return res.json(sweetResponse)
      } else {
        // Email chưa xác thực
        const userId = checkMailQuery.rows[0].id
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [password, userId])
        const sweetResponse = {
          title: `CẦN XÁC THỰC EMAIL`,
          text:
            sendEmail(userId, email) +
            `. Tài khoản của bạn chưa được đăng ký. Chúng tôi đã gửi một đường link xác thực tới email ${email}. Vui lòng kiểm tra Gmail (hoặc mục thư spam) và nhấp vào đường dẫn bên trong để tiếp tục.`,
          icon: 'info',
        }
        return res.json(sweetResponse)
      }
    } else {
      // Không tồn tại email trong csdl
      const result = await pool.query('INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id', [
        email,
        password,
      ])
      const userId = result.rows[0].id
      const sweetResponse = {
        title: `ĐÃ GỬI LINK XÁC THỰC`,
        text:
          sendEmail(userId, email) +
          `. Tài khoản của bạn chưa được đăng ký. Chúng tôi đã gửi một đường link xác thực tới email ${email}. Vui lòng kiểm tra Gmail (hoặc mục thư spam) và nhấp vào đường dẫn bên trong để tiếp tục.`,
        icon: 'info',
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
   * case1: cố tình bug url thiếu param token
   * case2: catch token không hợp lệ
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
    const payload = jwt.verify(token, 'concavang')
    const userId = payload.userId
    await pool.query('UPDATE users SET is_verified = true WHERE id = $1', [userId])
    // console.log('tokenFromRegisterVerify=',token);
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      maxAge: 86400,
      signed: true,
    })
    return res.redirect('/dashboard')
  } catch (error) {
    console.error('Lỗi khi xác thực token:', error)
    return res.status(500).send('Có lỗi xảy ra khi xác thực tài khoản.')
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
  try {
    const email = req.user.email
    const password = ''
    const resultQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    if (resultQuery.rowCount > 0) {
      const userId = resultQuery.rows[0].id
      const isEmailVerified = resultQuery.rows[0].is_verified
      if (isEmailVerified) {
        // là login
        const payload = {
          userId: userId,
          email: email,
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
        // là resent register
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [password, userId])
        const sweetResponse = {
          title: 'ĐÃ GỬI LINK XÁC THỰC',
          text:
            sendEmail(userId, email) +
            `. Tài khoản của bạn chưa được đăng ký. Chúng tôi đã gửi một đường link xác thực tới email ${email}. Vui lòng kiểm tra Gmail (hoặc mục thư spam) và nhấp vào đường dẫn bên trong để tiếp tục.`,
          icon: 'info',
        }
        return res.render('temp-page', { sweetResponse })
      }
    } else {
      // là register lần đầu, có tồn tại email trong csdl nhưng chưa verified.
      const result = await pool.query('INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id', [
        email,
        password,
      ])
      const userId = result.rows[0].id
      const sweetResponse = {
        title: 'ĐÃ GỬI LINK XÁC THỰC',
        text:
          sendEmail(userId, email) +
          `. Tài khoản của bạn chưa được đăng ký. Chúng tôi đã gửi một đường link xác thực tới email ${email}. Vui lòng kiểm tra Gmail (hoặc mục thư spam) và nhấp vào đường dẫn bên trong để tiếp tục.`,
        icon: 'info',
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

router.post('/login/email', async (req, res) => {
  try {
    const { email, password, is_remember } = req.body;
    const queryUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    /**
     * case1: account ko tồn tại
     * case2: account tồn tại nhưng chưa verified,
     * cast3: account sai mật khẩu
     */
    if(queryUser.rowCount <= 0 || queryUser.rows[0].is_verified != true) {
      const sweetResponse = {
        title: 'TÀI KHOẢN KHÔNG TỒN TẠI',
        text: `Tài khoản email ${email} này chưa được đăng ký`,
        icon: 'error'
      };
      return res.json(sweetResponse);
    }
    const storedPassword = queryUser.rows[0].password;
    const equalPassword = bycrypt.compareSync(password, storedPassword);
    if(!equalPassword) {
      const sweetResponse = {
        title: 'SAI MẬT KHẨU',
        text: `Mật khẩu không đúng`,
        icon: 'error'
      };
      return res.json(sweetResponse);
    }
    const userId = queryUser.rows[0].id;
    const payload = {
      userId: userId,
      email: email,
    }
    const token = jwt.sign(payload, 'concavang', { expiresIn: '1d' }); 
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 86400,
      signed: true,
    });
    const sweetResponse = {
      title: 'ĐĂNG NHẬP THÀNH CÔNG',
      text: `Chúng tôi sẽ điều hướng bạn trong giây lát!`,
      icon: 'success'
    };
    return res.json(sweetResponse);
  } catch (error) {
    console.log('error=', error.message);
    return res.status(500).send('Có lỗi xảy ra khi xác thực tài khoản.');
  }
});

module.exports = router
