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
    }).promise();
  } catch (error) {
    console.error('createConnectionPool error=', error)
    return null
  }
}

async function mysqlQuery(conn, sqlQuery) {
  try {
    const [result] = await conn.query(sqlQuery);
    return result;  
  } catch (error) {
    console.error('mysqlQuery error=', error);
    return null;
  }
}

async function preparedStamentMysqlQuery(conn, sqlQuery, params) {
  try {
    const [result] = await conn.execute(sqlQuery, params);
    return result;
  } catch (error) {
    console.error('preparedStamentMysqlQuery error=', error);
    return null;
  }
}

async function mysqlTransaction(conn, queries) {
  try {
    await conn.beginTransaction();
    const results = [];
    for(const query of queries) {
      const [result] = await conn.execute(query.sql, query.params);
      results.push(result);
    }
    await conn.commit();
    return results;
  } catch (error) {
    await conn.rollback();
    console.error('mysqlTransaction error:', error);
    return null;
  }
}

module.exports = { connectionPools, getConnectionPool, mysqlQuery, preparedStamentMysqlQuery, mysqlTransaction }
