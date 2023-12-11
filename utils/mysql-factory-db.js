const mysql = require('mysql2')
require('dotenv').config()

const connectionPools = {};

async function createConnectionPool(databaseName) {
    if (!connectionPools[databaseName]) {
      connectionPools[databaseName] = mysql.createPool({
        connectionLimit: 10,
        host: 'localhost',
        user: 'root',
        password: '',
        database: databaseName,
      });
    }
  
    return connectionPools[databaseName];
}

module.exports = { createConnectionPool };