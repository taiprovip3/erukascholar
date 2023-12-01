const moment = require('moment');

function calculateTimeAgo(timestamp) {
    const currentTime = moment();
    const inputTime = moment(timestamp, 'YYYY-MM-DD HH:mm:ss.SSS');

    const duration = moment.duration(currentTime.diff(inputTime));

    if (duration.asSeconds() < 60) {
        return `${Math.floor(duration.asSeconds())} giây trước`;
    } else if (duration.asMinutes() < 60) {
        return `${Math.floor(duration.asMinutes())} phút trước`;
    } else if (duration.asHours() < 24) {
        return `${Math.floor(duration.asHours())} giờ trước`;
    } else {
        return `${Math.floor(duration.asDays())} ngày trước`;
    }
}

module.exports = { calculateTimeAgo };