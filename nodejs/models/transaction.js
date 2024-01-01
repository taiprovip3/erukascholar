const { default: mongoose } = require('mongoose')

const transactionSchema = new mongoose.Schema({
  userId: Number,
  transId: String,
  amount: Number,
  bankCode: String,
  message: String,
  status: String,
  created_at: { type: Date, default: Date.now },
})

const Transaction = mongoose.model('Transaction', transactionSchema)

module.exports = Transaction
