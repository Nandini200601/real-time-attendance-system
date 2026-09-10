const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();

app.use(bodyParser.json());
app.use(express.static('public'));

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "bogininandini2510@gmail.com",
        pass: "iomf hgql anfw plwu"
    }
});

app.get('/', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'public', 'login.html')
    );
});

app.get('/students', (req, res) => {

    db.query(
        'SELECT student_id, student_name FROM students1',
        (err, rows) => {

            if (err) {
                return res.send(err);
            }

            res.json(rows);
        }
    );
});

app.post('/markAttendance', (req, res) => {

    const {
        student_id,
        status,
        subject,
        faculty,
        period_no
    } = req.body;

    const date =
        new Date().toISOString().split('T')[0];

    const time =
        new Date().toTimeString().split(' ')[0];

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
        [
            student_id,
            subject,
            faculty,
            period_no,
            date,
            time,
            status
        ],
        (err) => {

            if (err) {
                return res.send(err);
            }

            db.query(
                'SELECT * FROM students1 WHERE student_id=?',
                [student_id],
                (err, rows) => {

                    if (err) {
                        return res.send(err);
                    }

                    const student = rows[0];

                    const mailOptions = {
                        from:
                        'bogininandini2510@gmail.com',

                        to:
                        student.parent_email,

                        subject:
                        'Attendance Alert',

                        text:
`Dear Parent,

Student Name : ${student.student_name}
Student ID : ${student.student_id}

Status : ${status}

Subject : ${subject}
Faculty : ${faculty}
Period : ${period_no}

Date : ${date}
Time : ${time}

Thank You`
                    };

                    transporter.sendMail(
                        mailOptions,
                        (err) => {

                            if (err) {
                                console.log(err);
                            } else {
                                console.log(
                                'Email Sent Successfully'
                                );
                            }
                        }
                    );

                    res.send(
                    'Attendance Saved Successfully'
                    );
                }
            );
        }
    );
});

app.get('/attendance', (req, res) => {

    db.query(
        'SELECT * FROM attendance1',
        (err, rows) => {

            if (err) {
                return res.send(err);
            }

            res.json(rows);
        }
    );
});
app.get('/allstudents', (req, res) => {

    db.query(
        'SELECT * FROM students1',
        (err, rows) => {

            if(err){
                return res.send(err);
            }

            res.json(rows);
        }
    );
});
app.get('/reports', (req, res) => {

    db.query(
        'SELECT * FROM attendance1 ORDER BY id DESC',
        (err, rows) => {

            if(err){
                return res.send(err);
            }

            res.json(rows);
        }
    );
});
app.post('/login',(req,res)=>{

const {username,password}=req.body;

db.query(
'SELECT * FROM users WHERE username=? AND password=?',
[username,password],
(err,rows)=>{

if(err){
return res.send(err);
}

if(rows.length>0){
res.send("success");
}
else{
res.send("failed");
}

});
});

app.get('/percentage', (req, res) => {

const sql = `
SELECT
    s.student_id,
    s.student_name,

    IFNULL(java.perc,0) AS Java,
    IFNULL(dbms.perc,0) AS DBMS,
    IFNULL(ds.perc,0) AS DS,

    ROUND(
        (IFNULL(java.perc,0) + IFNULL(dbms.perc,0) + IFNULL(ds.perc,0)) / 3
    ,2) AS OverallPercentage

FROM students1 s

LEFT JOIN (
    SELECT student_id,
    ROUND(
        SUM(status='present') / COUNT(*) * 100
    ,2) AS perc
    FROM attendance1
    WHERE subject='java'
    GROUP BY student_id
) java ON s.student_id = java.student_id

LEFT JOIN (
    SELECT student_id,
    ROUND(
        SUM(status='present') / COUNT(*) * 100
    ,2) AS perc
    FROM attendance1
    WHERE subject='dbms'
    GROUP BY student_id
) dbms ON s.student_id = dbms.student_id

LEFT JOIN (
    SELECT student_id,
    ROUND(
        SUM(status='present') / COUNT(*) * 100
    ,2) AS perc
    FROM attendance1
    WHERE subject='ds'
    GROUP BY student_id
) ds ON s.student_id = ds.student_id
`;

db.query(sql, (err, rows) => {
    if (err) return res.send(err);
    res.json(rows);
});

});
app.get('/subjects', (req, res) => {

    db.query(
        'SELECT DISTINCT subject FROM attendance1',
        (err, rows) => {

            if(err){
                return res.send(err);
            }

            res.json(rows);
        }
    );

});

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

    db.query(sql,[subject],(err,rows)=>{

        if(err){
            return res.send(err);
        }

        res.json(rows);
    });

});app.listen(3000, () => {

    console.log(
    'Server Running on Port 3000'
    );
});