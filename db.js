require('dotenv').config();

const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

const caPath = path.join(__dirname, 'ca.pem');

console.log('Loading SSL certificate from:', caPath);

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT) || 3306,
    ssl: {
        ca: fs.readFileSync(caPath, 'utf8'),
        rejectUnauthorized: true
    }
});

db.connect((err) => {
    if (err) {
        console.error('MySQL connection failed:', err);
        return;
    }

    console.log('Aiven MySQL Connected Successfully');
});

module.exports = db;