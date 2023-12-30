const express = require('express')
const { preparedStamentMysqlQuery, getConnectionPool } = require('../utils/mysql-factory-db')
const Router = express.Router()

Router.post('/rating-stars', async (req, res) => {
  const { numberOfStar } = req.body
  if (!numberOfStar) {
    return res.status(500).send(error)
  }
  const mainPool = getConnectionPool('main')
  const conn = await mainPool.getConnection()
  try {
    const updateRatingStarSqlQuery = 'UPDATE server_metrics SET rates = rates + 1, stars = (stars * rates + ?) / (rates + 1)'
    await preparedStamentMysqlQuery(conn, updateRatingStarSqlQuery, [numberOfStar]);
    const sweetResponse = {
      title: 'BÌNH CHỌN THÀNH CÔNG',
      text: 'Cám ơn bạn đã đánh giá mức độ hài lòng của bạn về trang web của chúng tôi. Nếu có điều gì khiến bạn phiền lòng về trải nghiệm, mong bạn hãy cư xử văn minh góp ý để chúng tôi cải thiện xem xét và cải thiện ứng dụng của chúng một cách tốt hơn nữa!',
      icon: 'success',
    }
    return res.json(sweetResponse)
  } catch (error) {
    console.error('/rating-stars error=', error)
    return res.status(500).send(error)
  } finally {
    conn.release();
  }
})

module.exports = Router
