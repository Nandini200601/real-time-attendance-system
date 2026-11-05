
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./db');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();

// Middleware
app.use(cors({
    origin: [
        'https://real-time-attendance-system-brown.vercel.app'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// Gmail configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Attendance Backend is Running'
    });
});

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Get students
app.get('/students', (req, res) => {
    db.query(
        'SELECT student_id, student_name FROM students1',
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// Mark attendance and send parent email
app.post('/markAttendance', (req, res) => {
    const {
        student_id,
        status,
        subject,
        faculty,
        period_no
    } = req.body;

    if (!student_id || !status || !subject || !faculty || !period_no) {
        return res.status(400).send('Please provide all attendance details');
    }

    const now = new Date();

    const date = now.toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata'
    });

    const time = now.toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour12: false
    });

    const insertQuery = `
        INSERT INTO attendance1
        (
            student_id,
            subject,
            faculty,
            period_no,
            attendance_date,
            attendance_time,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        insertQuery,
        [student_id, subject, faculty, period_no, date, time, status],
        (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            db.query(
                'SELECT * FROM students1 WHERE student_id = ?',
                [student_id],
                (err, rows) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    if (!rows.length) {
                        return res.send('Attendance saved, but student details not found');
                    }

                    const student = rows[0];

                    if (
                        !student.parent_email ||
                        !process.env.EMAIL_USER ||
                        !process.env.EMAIL_PASS
                    ) {
                        return res.send('Attendance Saved Successfully. Email not configured.');
                    }

                    const mailOptions = {
                        from: process.env.EMAIL_USER,
                        to: student.parent_email,
                        subject: 'Attendance Alert',
                        text: `Dear Parent,

Student Name: ${student.student_name}
Student ID: ${student.student_id}

Status: ${status}
Subject: ${subject}
Faculty: ${faculty}
Period: ${period_no}

Date: ${date}
Time: ${time}

Thank You`
                    };

                    transporter.sendMail(mailOptions, (err) => {
                        if (err) {
                            console.error('Email sending failed:', err.message);
                        } else {
                            console.log('Email Sent Successfully');
                        }
                    });

                    res.send('Attendance Saved Successfully');
                }
            );
        }
    );
});

// Get all attendance
app.get('/attendance', (req, res) => {
    db.query(
        'SELECT * FROM attendance1',
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// Get all students
app.get('/allstudents', (req, res) => {
    db.query(
        'SELECT * FROM students1',
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// Attendance reports
app.get('/reports', (req, res) => {
    db.query(
        'SELECT * FROM attendance1 ORDER BY id DESC',
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// Login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Please enter username and password');
    }

    db.query(
        'SELECT * FROM users WHERE username = ? AND password = ?',
        [username, password],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (rows.length > 0) {
                res.send('success');
            } else {
                res.send('failed');
            }
        }
    );
});

// Calculate attendance percentage
app.get('/percentage', (req, res) => {
    const sql = `
        SELECT
            s.student_id,
            s.student_name,

            IFNULL(java.perc, 0) AS Java,
            IFNULL(dbms.perc, 0) AS DBMS,
            IFNULL(ds.perc, 0) AS DS,

            ROUND(
                (
                    IFNULL(java.perc, 0) +
                    IFNULL(dbms.perc, 0) +
                    IFNULL(ds.perc, 0)
                ) / 3,
                2
            ) AS OverallPercentage

        FROM students1 s

        LEFT JOIN (
            SELECT
                student_id,
                ROUND(
                    SUM(status = 'present') / COUNT(*) * 100,
                    2
                ) AS perc
            FROM attendance1
            WHERE subject = 'java'
            GROUP BY student_id
        ) java ON s.student_id = java.student_id

        LEFT JOIN (
            SELECT
                student_id,
                ROUND(
                    SUM(status = 'present') / COUNT(*) * 100,
                    2
                ) AS perc
            FROM attendance1
            WHERE subject = 'dbms'
            GROUP BY student_id
        ) dbms ON s.student_id = dbms.student_id

        LEFT JOIN (
            SELECT
                student_id,
                ROUND(
                    SUM(status = 'present') / COUNT(*) * 100,
                    2
                ) AS perc
            FROM attendance1
            WHERE subject = 'ds'
            GROUP BY student_id
        ) ds ON s.student_id = ds.student_id
    `;

    db.query(sql, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get available subjects
app.get('/subjects', (req, res) => {
    db.query(
        'SELECT DISTINCT subject FROM attendance1',
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// Subject-wise attendance report
app.get('/subjectReport/:subject', (req, res) => {
    const subject = req.params.subject;

    const sql = `
        SELECT
            a.student_id,
            s.student_name,
            a.status,
            a.attendance_date,
            a.period_no,
            a.faculty
        FROM attendance1 a
        JOIN students1 s
        ON a.student_id = s.student_id
        WHERE a.subject = ?
    `;

    db.query(sql, [subject], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Server port
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Attendance Backend Running on Port ${PORT}`);
});
