const crypto = require('crypto')

function hashPasswordSHA256(stringText) {
  const hashText = crypto.createHash('sha256').update(stringText).digest('hex')
  return hashText
}
module.exports = hashPasswordSHA256
