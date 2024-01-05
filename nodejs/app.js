/* root run */

const passport = require('passport')
const express = require('express')
const https = require('https')
const socketIO = require('socket.io')
const cors = require('cors')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const path = require('path')
const fs = require('fs')
require('dotenv').config()
const session = require('express-session')
require('./middleware')
const { authenticateToken } = require('./utils/oauth-middleware')
const { default: axios } = require('axios')
const mongoose = require('mongoose')
const morgan = require('morgan')
const rfs = require('rotating-file-stream')
const helper = require('./utils/calculate-timestamp')
const { getConnectionPool, mysqlQuery, preparedStamentMysqlQuery } = require('./utils/mysql-factory-db.js')

// App settings
const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))
app.use(cors())
app.use(
  session({
    secret: 'concavang',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  }),
)
app.use(passport.initialize())
app.use(passport.session())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cookieParser('concavang'))
app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')

const accessLogStream = rfs.createStream('access.log', {
  interval: '1d', // rotate daily
  path: './logs',
})
app.use(morgan('combined', { stream: accessLogStream }))

// Certificates
const options = {
  key: fs.readFileSync('./certificates/nhinguyen.tech/private.key'),
  cert: fs.readFileSync('./certificates/nhinguyen.tech/certificate.crt'),
}
// const options = {
//   key: fs.readFileSync('./certificates/erukalearn.me/key.pem'),
//   cert: fs.readFileSync('./certificates/erukalearn.me/erukalearn_me.crt'),
// };
const server = https.createServer(options, app)
const io = socketIO(server)

// Mongooes
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err))

// Rountings
app.get('/bbh', (req, res) => {
  const payload = req.session.user
  return res.render('bbh', { payload })
})

app.get('/', async (req, res) => {
  /**
   * 00. userData
   * 01. serverMetrics
   * 02. serverStatus
   * 03. eventTitles
   */
  const userData = req.session.user
  let payload = { userData }
  // get mysql connection
  const mainPool = getConnectionPool('main')
  const conn = await mainPool.getConnection()
  try {
    const serverMetricsSqlQuery = 'SELECT * FROM server_metrics';
    const serverMetricsResult = await mysqlQuery(conn, serverMetricsSqlQuery);
    const serverMetrics = serverMetricsResult[0]
    payload['serverMetrics'] = serverMetrics

    const membersSqlQuery = 'SELECT COUNT(*) as TOTAL FROM users';
    const membersResult = await mysqlQuery(conn, membersSqlQuery);
    const members = membersResult[0].TOTAL
    const serverUrl = `https://api.mcstatus.io/v2/status/java/${process.env.SERVER_IPV4}:${process.env.SERVER_PORT}`
    const serverStatusResponse = await axios.get(serverUrl)
    const onlinePlayers = serverStatusResponse.data.players.online
    const maxPlayers = serverStatusResponse.data.players.max
    const serverStatus = { onlinePlayers, maxPlayers, members }
    payload['serverStatus'] = serverStatus

    const titlesSqlQuery = 'SELECT title FROM posts ORDER BY created_at DESC'
    const titlesResult = await mysqlQuery(conn, titlesSqlQuery)
    let eventTitles = []
    if(titlesResult.length > 0) {
      eventTitles = titlesResult.map((e) => {
        return e.title
      })
    }
    payload['eventTitles'] = eventTitles
    return res.render('index', { payload, helper })
  } catch (error) {
    console.error('error=', error);
  } finally {
    conn.release();
  }
})

app.get('/dashboard', authenticateToken, async (req, res) => {
  return res.redirect('/')
})

app.use(require('./routes/authentication.js'))
app.use(require('./routes/user.js'))
app.use(require('./routes/rating-stars.js'))
app.use(require('./routes/report.js'))
app.use(require('./routes/postings.js'))
app.use(require('./routes/instruct.js'))
app.use(require('./routes/shop.js'))
app.use(require('./routes/recharge.js'))
app.use(require('./routes/server.js'))

const schedule = require('node-schedule')
const { title } = require('process')

const cronExpress = '0 45 10 * * *'
const j = schedule.scheduleJob(cronExpress, function (fireDate) {
  console.log('running job!')
  console.log(fireDate)
  const message = 'OPENING'
  io.emit('emitter', message)
})

// Khởi động server
const port = process.env.PORT
server.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
