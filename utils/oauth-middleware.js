const jwt = require('jsonwebtoken')

function authenticateGoogleOAuth(req, res, next) {
  if (req.user) {
    return next()
  }
  return res.redirect('/auth')
}

function authenticateToken(req, res, next) {
  try {
    const token = req.signedCookies.token
    const payload = jwt.verify(token, 'concavang')
    req.session.user = payload
    return next()
  } catch (error) {
    console.error('authenticateToken error=', error.message)
    res.clearCookie('token')
    return res.redirect('/auth')
  }
}

module.exports = {
  authenticateGoogleOAuth,
  authenticateToken,
}
