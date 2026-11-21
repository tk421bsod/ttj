import express from 'express';
import mysql2 from 'mysql2';
import dotenv from 'dotenv';

const PORT = 3006;
const DIRNAME = import.meta.dirname;

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

dotenv.config();
const pool = mysql2.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
}).promise();

async function get_root(req, res) {
    let [jobs] = await pool.execute(`SELECT * FROM jobs WHERE close_date >= CURDATE() ORDER BY post_date DESC, id DESC`);
    res.render('index', {jobs});
}

function get_add_job(req, res) {
    res.sendFile(`${DIRNAME}/views/add-job.html`);
}

async function get_view_job(req, res) {
    console.log(req.params.job_id);
    const job_id = req.params.job_id;
    let [job] = await pool.execute(`SELECT * FROM jobs WHERE uuid = ?`, [job_id]);
    console.log(job);
    if (!job?.length) {
        return res.status(400).send("<h1>Sorry, that job ID is invalid.</h1><p>Check the job ID and try again.</p>");
    }
    job = job[0];
    res.render('view-job', { job });
}

function handle_checkbox_field(f) {
    return f ? 1 : 0;
}

async function save_job(req, res) {
    let job = req.body;
    console.log(job)

    job.is_paid = handle_checkbox_field(job.is_paid);
    job.is_internship = handle_checkbox_field(job.is_internship);

    try {
        const sql = `INSERT INTO jobs(title, company, location, post_date, close_date, trade, internship, type, is_paid, compensation, description, posting_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const params = [job.title, job.company, job.location, job.post_date, job.close_date, job.trade, job.is_internship, job.type, job.is_paid, job.compensation, job.description, job.posting_link];
        let [result, fields] = await pool.execute(sql, params);
        console.log(result.insertId);
        [result] = await pool.execute(`SELECT * FROM jobs WHERE id = ?`, [result.insertId]);
        job.uuid = result[0].uuid;
        res.render('confirmation', { job });
    } catch (err) {
        console.log(err);
        res.status(500).send("<h1>Sorry, your job couldn't be saved.</h1><p>Please try again later.</p>")
    }
}

app.get('/', get_root);
app.get('/add-job', get_add_job);
app.get('/view-job/:job_id', get_view_job);
app.post('/submit-job', save_job);

app.listen(PORT, () => {console.log("Server started")});