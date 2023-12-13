const Minio = require('minio');
require('dotenv').config()

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_ENDPOINT,
    port: 9000,
    useSSL: false,
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
});

const bucketName = 'avatar';

minioClient.bucketExists(bucketName, function(err, exists) {
    if(err || !exists) {
        minioClient.makeBucket(bucketName, 'us-east-1', function(err) {
            if (err) return console.log('Error creating bucket: ', err);
            console.log('Bucket created successfully');
        });
    }
});

module.exports = minioClient;