"use strict";

const mysql = require('mysql2');

const pool = mysql.createPool({
    host:     'db',
    user:     'root',
    password: 'password',
    database: 'sharespace'
});

const promisePool = pool.promise();

async function query(sql, params) {
    const [rows] = await promisePool.execute(sql, params || []);
    return rows;
}

module.exports = { query };
