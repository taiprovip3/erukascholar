const express = require('express')
const pool = require('../utils/db')
const router = express.Router()

router.post('/report', async (req, res) => {
  try {
    const body = req.body
    await pool.query('INSERT INTO reports (reporter, bug_type, bug_detail, bug_level) VALUES ($1, $2, $3, $4)', [
      body.reporter,
      body.objectErrorType,
      body.noiDung,
      body.severity,
    ])
    return res.status(200).send()
  } catch (error) {
    console.error(error)
    return res.status(500).send()
  }
})

module.exports = router
