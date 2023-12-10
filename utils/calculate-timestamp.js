const moment = require('moment')

function calculateTimeAgo(timestamp) {
  const currentTime = moment()
  const inputTime = moment(timestamp, 'YYYY-MM-DD HH:mm:ss.SSS')

  const duration = moment.duration(currentTime.diff(inputTime))

  if (duration.asSeconds() < 60) {
    return `${String(Math.floor(duration.asSeconds())).padStart(2, '0')} giây trước`
  } else if (duration.asMinutes() < 60) {
    return `${String(Math.floor(duration.asMinutes())).padStart(2, '0')} phút trước`
  } else if (duration.asHours() < 24) {
    return `${String(Math.floor(duration.asHours())).padStart(2, '0')} giờ trước`
  } else if (duration.asDays() < 30) {
    return `${String(Math.floor(duration.asDays())).padStart(2, '0')} ngày trước`
  } else if (duration.asMonths() < 12) {
    return `${String(Math.floor(duration.asMonths())).padStart(2, '0')} tháng trước`
  } else {
    return `${String(Math.floor(duration.asYears())).padStart(2, '0')} năm trước`
  }
}

function isHotPost(timestamp) {
  const currentTime = moment()
  const inputTime = moment(timestamp, 'YYYY-MM-DD HH:mm:ss.SSS')
  const duration = moment.duration(currentTime.diff(inputTime))
  const daysDifference = Math.abs(Math.floor(duration.asDays()))
  return daysDifference <= 14
}

module.exports = { calculateTimeAgo, isHotPost }
