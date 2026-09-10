const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Nandini@24',
    database: 'attendance_system'
});

db.connect(err => {
    if (err) throw err;
    console.log('MySQL Connected');
});

module.exports = db;