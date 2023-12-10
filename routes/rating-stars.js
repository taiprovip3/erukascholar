const express = require('express')
const pool = require('../utils/db')
const Router = express.Router()

Router.post('/rating-stars', async (req, res) => {
  const { numberOfStar } = req.body
  if (!numberOfStar) {
    return res.status(500).send(error)
  }
  try {
    await pool.query('UPDATE server_metrics SET rates = rates + 1, stars = (stars * rates + $1) / (rates + 1)', [
      numberOfStar,
    ])
    const sweetResponse = {
      title: 'BÌNH CHỌN THÀNH CÔNG',
      text: 'Cám ơn bạn đã đánh giá mức độ hài lòng của bạn về trang web của chúng tôi. Nếu có điều gì khiến bạn phiền lòng về trải nghiệm, mong bạn hãy cư xử văn minh góp ý để chúng tôi cải thiện xem xét và cải thiện ứng dụng của chúng một cách tốt hơn nữa!',
      icon: 'success',
    }
    return res.json(sweetResponse)
  } catch (error) {
    console.error('/rating-stars error=', error)
    return res.status(500).send(error)
  }
})

module.exports = Router
