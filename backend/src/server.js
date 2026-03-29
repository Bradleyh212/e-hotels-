import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
	res.send('e-Hotels API is running');
});

app.get('/test-db', async (req, res) => {
	try {
		const result = await pool.query('SELECT NOW()');
		res.json({
			message: 'Database connected successfully',
			time: result.rows[0]
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: 'Database connection failed' });
	}
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});