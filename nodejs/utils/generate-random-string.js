const crypto = require('crypto')
function generateRandomString2(length) {
  // Sinh ngẫu nhiên một buffer với độ dài là length / 2 (vì mỗi byte tạo ra 2 ký tự hex)
  const randomBytes = crypto.randomBytes(length / 2)
  // Chuyển buffer thành chuỗi hex
  const randomString = randomBytes.toString('hex')
  return randomString
}

module.exports = generateRandomString2
