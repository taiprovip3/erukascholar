const Minio = require('minio')
require('dotenv').config()
const fs = require('fs');
const path = require('path');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
})

const bucketName = 'avatar'
const objectName = '25-1702483920909-cat-oew.jpg';
const filePath = path.join(process.cwd(), 'public', 'images', '25-1702483920909-cat-oew.jpg');

minioClient.bucketExists(bucketName, function (err, exists) {
  if (err || !exists) {
    minioClient.makeBucket(bucketName, 'us-east-1', function (err) {
      if (err) return console.log('Error creating bucket: ', err)
      console.log('Bucket created successfully')

      uploadDefaultAvatar();
    })
  } else {
    uploadDefaultAvatar();
  }
})

function uploadDefaultAvatar() {

  const metaData = {
    'Content-Type': 'image/jpeg',
  };
  const fileStream = fs.createReadStream(filePath);
  minioClient.putObject(bucketName, objectName, fileStream, metaData, function (err, etag) {
    if (err) {
      return console.log('Error uploading file: ', err);
    }
    console.log('File uploaded successfully. ETag:', etag);
  });
}

module.exports = minioClient
