const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

function sendEmail(userId, toEmail) {
  try {
    const token = jwt.sign({ userId: userId, email: toEmail }, 'concavang', { expiresIn: '1d' });
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'taito1doraemon@gmail.com',
        pass: 'jmsqgsjqqopsfakz',
      },
    });
    const mailOptions = {
      from: 'taito1doraemon@gmail.com',
      to: toEmail,
      subject: 'Bún Bò Huế Bảng Đen',
      text: `Nhấp vào đường link sau để xác thực tài khoản: https://erukascholar.live/register/verify?token=${token}`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if(error) {
        console.error('Lỗi gửi email:', error);
        return error.message;
        // return res.status(500).send('Có lỗi xảy ra khi gửi email xác thực.');
      } else {
        console.log('Email đã được gửi:', info.response);
        // return res.send('Email xác thực đã được gửi.');
        return 'Email sent';
      }
    });
    return `Email was sent to ${toEmail}!`;
  } catch (error) {
    return error.message;
  }
}

module.exports = sendEmail;