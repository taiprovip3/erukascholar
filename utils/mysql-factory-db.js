const mysql = require('mysql2')
require('dotenv').config()

const connectionPools = {}

function getConnectionPool(databaseName) {
  if (!connectionPools[databaseName]) {
    connectionPools[databaseName] = createConnectionPool(databaseName)
  }
  return connectionPools[databaseName]
}

function createConnectionPool(databaseName) {
  console.log(`Creating a new pool connections to ${databaseName}..`)
  try {
    return mysql.createPool({
      connectionLimit: 10,
      host: 'localhost',
      user: 'root',
      port: 3306,
      password: '',
      database: `${process.env.SERVER_NAME}_${databaseName}`,
    })
  } catch (error) {
    console.error('createConnectionPool error=', error)
    return null
  }
}

module.exports = { connectionPools, getConnectionPool }
