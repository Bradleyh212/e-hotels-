import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from the frontend directory
app.use(express.static(path.join(__dirname, '../../frontend')));

const asyncHandler = fn => async (req, res) => {
	try {
		await fn(req, res);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: error.message || 'Internal server error' });
	}
};

const parseNumber = value => {
	if (value === undefined || value === null || value === '') {
		return null;
	}
	const num = Number(value);
	return Number.isNaN(num) ? null : num;
};

const hashPassword = password => {
	const salt = crypto.randomBytes(16).toString('hex');
	const hashed = crypto.scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${hashed}`;
};

const verifyPassword = (password, storedHash) => {
	if (!storedHash.includes(':')) {
		return password === storedHash;
	}
	const [salt, key] = storedHash.split(':');
	const hashBuffer = crypto.scryptSync(password, salt, 64);
	const keyBuffer = Buffer.from(key, 'hex');
	if (hashBuffer.length !== keyBuffer.length) {
		return false;
	}
	return crypto.timingSafeEqual(hashBuffer, keyBuffer);
};

app.get('/', (req, res) => {
	res.send('e-Hotels API is running');
});


app.get('/test-db', asyncHandler(async (req, res) => {
	const result = await pool.query('SELECT NOW()');
	res.json({
		message: 'Database connected successfully',
		time: result.rows[0]
	});
}));

app.post('/api/auth/register', asyncHandler(async (req, res) => {
	const {
		role,
		username,
		password,
		full_name,
		address,
		id_type,
		id_number,
		chain_id,
		ssn_sin,
		employee_role
	} = req.body;

	if (!role || !username || !password) {
		return res.status(400).json({ error: 'role, username, and password are required' });
	}

	if (!['customer', 'employee'].includes(role)) {
		return res.status(400).json({ error: 'role must be customer or employee' });
	}

	const client = await pool.connect();
	try {
		await client.query('BEGIN');

		const existingUser = await client.query('SELECT user_id FROM app_user WHERE username = $1', [username]);
		if (existingUser.rows.length) {
			await client.query('ROLLBACK');
			return res.status(409).json({ error: 'username already exists' });
		}

		const passwordHash = hashPassword(password);

		if (role === 'customer') {
			if (!full_name || !id_type || !id_number) {
				await client.query('ROLLBACK');
				return res.status(400).json({ error: 'Customer requires full_name, id_type, and id_number' });
			}

			const customerResult = await client.query(
				`INSERT INTO customer (full_name, address, id_type, id_number, registration_date)
				 VALUES ($1, $2, $3, $4, CURRENT_DATE)
				 RETURNING cust_id, full_name`,
				[full_name, address || null, id_type, id_number]
			);

			const customer = customerResult.rows[0];
			const userResult = await client.query(
				`INSERT INTO app_user (username, password_hash, role, cust_id)
				 VALUES ($1, $2, 'customer', $3)
				 RETURNING user_id, username, role, cust_id`,
				[username, passwordHash, customer.cust_id]
			);

			await client.query('COMMIT');
			return res.status(201).json({
				message: 'Customer account created successfully',
				user: userResult.rows[0]
			});
		}

		if (!chain_id || !ssn_sin || !full_name) {
			await client.query('ROLLBACK');
			return res.status(400).json({ error: 'Employee requires chain_id, ssn_sin, and full_name' });
		}

		// Map chain_id to hotel_id (first hotel of each chain)
		const hotelId = ((chain_id - 1) * 8) + 1;
		
		const hotelExists = await client.query('SELECT hotel_id, name FROM hotel WHERE hotel_id = $1', [hotelId]);
		if (!hotelExists.rows.length) {
			await client.query('ROLLBACK');
			return res.status(400).json({ error: `Invalid chain_id (${chain_id}). No hotels found for this chain.` });
		}

		const employeeResult = await client.query(
			`INSERT INTO employee (hotel_id, ssn_sin, full_name, address, role)
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING emp_id, full_name`,
			[hotelId, ssn_sin, full_name, address || null, employee_role || 'Receptionist']
		);

		const employee = employeeResult.rows[0];
		const userResult = await client.query(
			`INSERT INTO app_user (username, password_hash, role, emp_id)
			 VALUES ($1, $2, 'employee', $3)
			 RETURNING user_id, username, role, emp_id`,
			[username, passwordHash, employee.emp_id]
		);

		await client.query('COMMIT');
		return res.status(201).json({
			message: 'Employee account created successfully',
			user: userResult.rows[0]
		});
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
	const { role, username, password } = req.body;

	if (!role || !username || !password) {
		return res.status(400).json({ error: 'role, username, and password are required' });
	}

	const result = await pool.query(
		`SELECT user_id, username, role, cust_id, emp_id, password_hash
		 FROM app_user
		 WHERE username = $1 AND role = $2`,
		[username, role]
	);

	if (!result.rows.length) {
		return res.status(401).json({ error: 'Invalid credentials' });
	}

	const user = result.rows[0];
	const valid = verifyPassword(password, user.password_hash);
	if (!valid) {
		return res.status(401).json({ error: 'Invalid credentials' });
	}

	res.json({
		message: 'Login successful',
		user: {
			user_id: user.user_id,
			username: user.username,
			role: user.role,
			cust_id: user.cust_id,
			emp_id: user.emp_id
		}
	});
}));

app.get('/api/customers/:id/self', asyncHandler(async (req, res) => {
	const customerId = Number(req.params.id);
	const userId = Number(req.query.userId);

	if (!customerId || !userId) {
		return res.status(400).json({ error: 'customer id and userId are required' });
	}

	const result = await pool.query(
		`SELECT
			u.user_id,
			u.username,
			u.role,
			c.cust_id,
			c.full_name,
			c.address,
			c.id_type,
			c.id_number,
			c.registration_date
		 FROM app_user u
		 JOIN customer c ON c.cust_id = u.cust_id
		 WHERE u.user_id = $1
		 AND c.cust_id = $2
		 AND u.role = 'customer'`,
		[userId, customerId]
	);

	if (!result.rows.length) {
		return res.status(404).json({ error: 'Customer account not found for this session' });
	}

	res.json(result.rows[0]);
}));

app.put('/api/customers/:id/self', asyncHandler(async (req, res) => {
	const customerId = Number(req.params.id);
	const {
		user_id,
		username,
		password,
		full_name,
		address,
		id_type,
		id_number
	} = req.body;

	const userId = Number(user_id);
	if (!customerId || !userId) {
		return res.status(400).json({ error: 'customer id and user_id are required' });
	}

	const client = await pool.connect();
	try {
		await client.query('BEGIN');

		const linkResult = await client.query(
			`SELECT user_id, username, role, cust_id
			 FROM app_user
			 WHERE user_id = $1
			 AND cust_id = $2
			 AND role = 'customer'`,
			[userId, customerId]
		);

		if (!linkResult.rows.length) {
			await client.query('ROLLBACK');
			return res.status(404).json({ error: 'Customer account not found for this session' });
		}

		if (username) {
			const usernameCheck = await client.query(
				'SELECT user_id FROM app_user WHERE username = $1 AND user_id <> $2',
				[username, userId]
			);
			if (usernameCheck.rows.length) {
				await client.query('ROLLBACK');
				return res.status(409).json({ error: 'username already exists' });
			}
		}

		await client.query(
			`UPDATE customer
			 SET full_name = COALESCE($1, full_name),
				 address = COALESCE($2, address),
				 id_type = COALESCE($3, id_type),
				 id_number = COALESCE($4, id_number)
			 WHERE cust_id = $5`,
			[full_name || null, address || null, id_type || null, id_number || null, customerId]
		);

		if (username || password) {
			const fields = [];
			const values = [];
			let idx = 1;

			if (username) {
				fields.push(`username = $${idx++}`);
				values.push(username);
			}
			if (password) {
				fields.push(`password_hash = $${idx++}`);
				values.push(hashPassword(password));
			}
			values.push(userId);

			await client.query(
				`UPDATE app_user SET ${fields.join(', ')} WHERE user_id = $${idx}`,
				values
			);
		}

		const updated = await client.query(
			`SELECT
				u.user_id,
				u.username,
				c.cust_id,
				c.full_name,
				c.address,
				c.id_type,
				c.id_number
			 FROM app_user u
			 JOIN customer c ON c.cust_id = u.cust_id
			 WHERE u.user_id = $1 AND c.cust_id = $2`,
			[userId, customerId]
		);

		await client.query('COMMIT');
		res.json({ message: 'Profile updated successfully', profile: updated.rows[0] });
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}));

app.delete('/api/customers/:id/self', asyncHandler(async (req, res) => {
	const customerId = Number(req.params.id);
	const userId = Number(req.body.user_id);

	if (!customerId || !userId) {
		return res.status(400).json({ error: 'customer id and user_id are required' });
	}

	const client = await pool.connect();
	try {
		await client.query('BEGIN');

		const linkResult = await client.query(
			`SELECT user_id FROM app_user WHERE user_id = $1 AND cust_id = $2 AND role = 'customer'`,
			[userId, customerId]
		);

		if (!linkResult.rows.length) {
			await client.query('ROLLBACK');
			return res.status(404).json({ error: 'Customer account not found for this session' });
		}

		await client.query('DELETE FROM renting WHERE cust_id = $1', [customerId]);
		await client.query('DELETE FROM booking WHERE cust_id = $1', [customerId]);

		const deleteCustomer = await client.query('DELETE FROM customer WHERE cust_id = $1 RETURNING cust_id', [customerId]);
		if (!deleteCustomer.rows.length) {
			await client.query('ROLLBACK');
			return res.status(404).json({ error: 'Customer not found' });
		}

		await client.query('COMMIT');
		res.json({ message: 'Customer account deleted successfully', deleted: true });
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}));

app.get('/api/filters', asyncHandler(async (req, res) => {
	const [chains, capacities, areas, ratings] = await Promise.all([
		pool.query('SELECT chain_id, name FROM hotelchain ORDER BY name'),
		pool.query('SELECT DISTINCT capacity FROM room ORDER BY capacity'),
		pool.query('SELECT DISTINCT address FROM hotel ORDER BY address'),
		pool.query('SELECT DISTINCT rating FROM hotel ORDER BY rating')
	]);

	res.json({
		chains: chains.rows,
		capacities: capacities.rows.map(r => r.capacity),
		areas: areas.rows.map(r => r.address),
		ratings: ratings.rows.map(r => r.rating)
	});
}));

app.get('/api/chains', asyncHandler(async (req, res) => {
	const result = await pool.query('SELECT chain_id, name FROM hotelchain ORDER BY name');
	res.json(result.rows);
}));

app.get('/api/rooms/available', asyncHandler(async (req, res) => {
	const {
		capacity,
		minPrice,
		maxPrice,
		rating,
		area,
		chainId,
		minTotalRooms,
		maxTotalRooms,
		startDate,
		endDate
	} = req.query;

	if ((startDate && !endDate) || (!startDate && endDate)) {
		return res.status(400).json({ error: 'Both startDate and endDate are required together' });
	}

	if (startDate && endDate && startDate >= endDate) {
		return res.status(400).json({ error: 'startDate must be earlier than endDate' });
	}

	let query = `
		SELECT
			r.room_id,
			r.room_number,
			r.capacity,
			r.view_type,
			r.extendable,
			r.price,
			r.status,
			h.hotel_id,
			h.name AS hotel_name,
			h.address,
			h.rating,
			h.email AS hotel_email,
			h.phone AS hotel_phone,
			array_remove(array_agg(DISTINCT a.name), NULL) AS amenities,
			hc.chain_id,
			hc.name AS chain_name,
			rc.total_rooms
		FROM room r
		JOIN hotel h ON r.hotel_id = h.hotel_id
		JOIN hotelchain hc ON h.chain_id = hc.chain_id
		JOIN (
			SELECT hotel_id, COUNT(*)::int AS total_rooms
			FROM room
			GROUP BY hotel_id
		) rc ON rc.hotel_id = h.hotel_id
		LEFT JOIN roomhasamenity ra ON ra.room_id = r.room_id
		LEFT JOIN amenity a ON a.amenity_id = ra.amenity_id
		WHERE r.status = 'Available'
	`;
	const values = [];
	let index = 1;

	if (capacity) {
		query += ` AND r.capacity = $${index++}`;
		values.push(capacity);
	}

	const minPriceNum = parseNumber(minPrice);
	if (minPriceNum !== null) {
		query += ` AND r.price >= $${index++}`;
		values.push(minPriceNum);
	}

	const maxPriceNum = parseNumber(maxPrice);
	if (maxPriceNum !== null) {
		query += ` AND r.price <= $${index++}`;
		values.push(maxPriceNum);
	}

	const ratingNum = parseNumber(rating);
	if (ratingNum !== null) {
		query += ` AND h.rating = $${index++}`;
		values.push(ratingNum);
	}

	if (area) {
		query += ` AND h.address ILIKE $${index++}`;
		values.push(`%${area}%`);
	}

	const chainNum = parseNumber(chainId);
	if (chainNum !== null) {
		query += ` AND hc.chain_id = $${index++}`;
		values.push(chainNum);
	}

	const minRoomsNum = parseNumber(minTotalRooms);
	if (minRoomsNum !== null) {
		query += ` AND rc.total_rooms >= $${index++}`;
		values.push(minRoomsNum);
	}

	const maxRoomsNum = parseNumber(maxTotalRooms);
	if (maxRoomsNum !== null) {
		query += ` AND rc.total_rooms <= $${index++}`;
		values.push(maxRoomsNum);
	}

	if (startDate && endDate) {
		query += `
			AND r.room_id NOT IN (
				SELECT b.room_id
				FROM booking b
				WHERE $${index} < b.end_date
				AND $${index + 1} > b.start_date
			)
			AND r.room_id NOT IN (
				SELECT rt.room_id
				FROM renting rt
				WHERE $${index} < rt.checkout_date
				AND $${index + 1} > rt.checkin_date
			)
		`;
		values.push(startDate, endDate);
		index += 2;
	}

	query += ' GROUP BY r.room_id, r.room_number, r.capacity, r.view_type, r.extendable, r.price, r.status, h.hotel_id, h.name, h.address, h.rating, h.email, h.phone, hc.chain_id, hc.name, rc.total_rooms';
	query += ' ORDER BY h.name, r.room_number';

	const result = await pool.query(query, values);
	res.json(result.rows);
}));

app.get('/api/views/available-rooms-per-area', asyncHandler(async (req, res) => {
	const result = await pool.query('SELECT * FROM view_available_rooms_per_area');
	res.json(result.rows);
}));

app.get('/api/views/hotel-capacity', asyncHandler(async (req, res) => {
	const result = await pool.query('SELECT * FROM view_hotel_capacity');
	res.json(result.rows);
}));

app.get('/api/customers', asyncHandler(async (req, res) => {
	const result = await pool.query('SELECT * FROM customer ORDER BY cust_id');
	res.json(result.rows);
}));

app.post('/api/customers', asyncHandler(async (req, res) => {
	const { full_name, address, id_type, id_number, registration_date } = req.body;
	const result = await pool.query(
		`INSERT INTO customer (full_name, address, id_type, id_number, registration_date)
		 VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE))
		 RETURNING *`,
		[full_name, address, id_type, id_number, registration_date || null]
	);
	res.status(201).json(result.rows[0]);
}));

app.put('/api/customers/:id', asyncHandler(async (req, res) => {
	const customerId = Number(req.params.id);
	const { full_name, address, id_type, id_number } = req.body;

	if (!customerId) {
		return res.status(400).json({ error: 'Valid customer id is required' });
	}

	if (!full_name || !id_type || !id_number) {
		return res.status(400).json({ error: 'full_name, id_type, and id_number are required' });
	}

	try {
		const duplicateCheck = await pool.query(
			`SELECT cust_id
			 FROM customer
			 WHERE id_type = $1
			 AND id_number = $2
			 AND cust_id <> $3`,
			[id_type, id_number, customerId]
		);

		if (duplicateCheck.rows.length) {
			return res.status(409).json({ error: 'A customer with this ID already exists' });
		}

		const result = await pool.query(
			`UPDATE customer
			 SET full_name = $1,
				 address = $2,
				 id_type = $3,
				 id_number = $4
			 WHERE cust_id = $5
			 RETURNING *`,
			[full_name, address || null, id_type, id_number, customerId]
		);

		if (!result.rows.length) {
			return res.status(404).json({ error: 'Customer not found' });
		}

		res.json(result.rows[0]);
	} catch (error) {
		if (error.code === '23505') {
			return res.status(409).json({ error: 'A customer with this ID already exists' });
		}
		throw error;
	}
}));

app.delete('/api/customers/:id', asyncHandler(async (req, res) => {
	const customerId = Number(req.params.id);

	if (!customerId) {
		return res.status(400).json({ error: 'Valid customer id is required' });
	}

	const result = await pool.query(
		'DELETE FROM customer WHERE cust_id = $1 RETURNING cust_id',
		[customerId]
	);

	if (!result.rows.length) {
		return res.status(404).json({ error: 'Customer not found' });
	}

	res.json({ deleted: true });
}));

app.delete('/api/customers/:id', asyncHandler(async (req, res) => {
	const result = await pool.query('DELETE FROM customer WHERE cust_id = $1 RETURNING cust_id', [req.params.id]);
	if (!result.rows.length) {
		return res.status(404).json({ error: 'Customer not found' });
	}
	res.json({ deleted: true });
}));

app.get('/api/employees', asyncHandler(async (req, res) => {
	const result = await pool.query('SELECT * FROM employee ORDER BY emp_id');
	res.json(result.rows);
}));

app.post('/api/employees', asyncHandler(async (req, res) => {
	const { chain_id, ssn_sin, full_name, address, role } = req.body;

	if (!chain_id || !ssn_sin || !full_name || !role) {
		return res.status(400).json({ error: 'chain_id, ssn_sin, full_name, and role are required' });
	}

	const hotelResult = await pool.query(
		'SELECT hotel_id FROM hotel WHERE chain_id = $1 ORDER BY hotel_id LIMIT 1',
		[chain_id]
	);

	if (!hotelResult.rows.length) {
		return res.status(400).json({ error: 'No hotel found for selected chain' });
	}

	const hotelId = hotelResult.rows[0].hotel_id;

	try {
		const result = await pool.query(
			`INSERT INTO employee (hotel_id, ssn_sin, full_name, address, role)
			 VALUES ($1, $2, $3, $4, $5)
			 RETURNING *`,
			[hotelId, ssn_sin, full_name, address || null, role]
		);

		res.status(201).json(result.rows[0]);
	} catch (error) {
		if (error.code === '23505') {
			return res.status(409).json({ error: 'An employee with this SSN/SIN already exists' });
		}
		throw error;
	}
}));

app.put('/api/employees/:id', asyncHandler(async (req, res) => {
	const { chain_id, ssn_sin, full_name, address, role } = req.body;
	const employeeId = Number(req.params.id);

	if (!employeeId) {
		return res.status(400).json({ error: 'Valid employee id is required' });
	}

	if (!chain_id || !ssn_sin || !full_name || !role) {
		return res.status(400).json({ error: 'chain_id, ssn_sin, full_name, and role are required' });
	}

	const hotelResult = await pool.query(
		'SELECT hotel_id FROM hotel WHERE chain_id = $1 ORDER BY hotel_id LIMIT 1',
		[chain_id]
	);

	if (!hotelResult.rows.length) {
		return res.status(400).json({ error: 'No hotel found for selected chain' });
	}

	const hotelId = hotelResult.rows[0].hotel_id;

	const duplicateCheck = await pool.query(
		`SELECT emp_id
		 FROM employee
		 WHERE ssn_sin = $1
		 AND emp_id <> $2`,
		[ssn_sin, employeeId]
	);

	if (duplicateCheck.rows.length) {
		return res.status(409).json({ error: 'An employee with this SSN/SIN already exists' });
	}

	const result = await pool.query(
		`UPDATE employee
		 SET hotel_id = $1,
			 ssn_sin = $2,
			 full_name = $3,
			 address = $4,
			 role = $5
		 WHERE emp_id = $6
		 RETURNING *`,
		[hotelId, ssn_sin, full_name, address || null, role, employeeId]
	);

	if (!result.rows.length) {
		return res.status(404).json({ error: 'Employee not found' });
	}

	res.json(result.rows[0]);
}));

app.delete('/api/employees/:id', asyncHandler(async (req, res) => {
	const employeeId = Number(req.params.id);

	if (!employeeId) {
		return res.status(400).json({ error: 'Valid employee id is required' });
	}

	const result = await pool.query(
		'DELETE FROM employee WHERE emp_id = $1 RETURNING emp_id',
		[employeeId]
	);

	if (!result.rows.length) {
		return res.status(404).json({ error: 'Employee not found' });
	}

	res.json({ deleted: true });
}));

app.delete('/api/employees/:id', asyncHandler(async (req, res) => {
	const result = await pool.query('DELETE FROM employee WHERE emp_id = $1 RETURNING emp_id', [req.params.id]);
	if (!result.rows.length) {
		return res.status(404).json({ error: 'Employee not found' });
	}
	res.json({ deleted: true });
}));

app.get('/api/hotels', asyncHandler(async (req, res) => {
	const result = await pool.query('SELECT * FROM hotel ORDER BY hotel_id');
	res.json(result.rows);
}));

app.post('/api/hotels', asyncHandler(async (req, res) => {
	const { chain_id, name, rating, address, email, phone, manager_id } = req.body;
	const result = await pool.query(
		`INSERT INTO hotel (chain_id, name, rating, address, email, phone, manager_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING *`,
		[chain_id, name, rating, address, email, phone, manager_id || null]
	);
	res.status(201).json(result.rows[0]);
}));

app.put('/api/hotels/:id', asyncHandler(async (req, res) => {
	const hotelId = Number(req.params.id);
	const { chain_id, name, rating, address, email, phone, manager_id } = req.body;

	if (!hotelId) {
		return res.status(400).json({ error: 'Valid hotel id is required' });
	}

	if (!chain_id || !name || !rating || !address) {
		return res.status(400).json({ error: 'chain_id, name, rating, and address are required' });
	}

	try {
		const result = await pool.query(
			`UPDATE hotel
			 SET chain_id = $1,
				 name = $2,
				 rating = $3,
				 address = $4,
				 email = $5,
				 phone = $6,
				 manager_id = $7
			 WHERE hotel_id = $8
			 RETURNING *`,
			[chain_id, name, rating, address, email || null, phone || null, manager_id || null, hotelId]
		);

		if (!result.rows.length) {
			return res.status(404).json({ error: 'Hotel not found' });
		}

		res.json(result.rows[0]);
	} catch (error) {
		if (error.code === '23503') {
			return res.status(409).json({ error: 'Invalid chain or manager reference' });
		}
		throw error;
	}
}));

app.put('/api/hotels/:id', asyncHandler(async (req, res) => {
	const hotelId = Number(req.params.id);
	const { chain_id, name, rating, address, email, phone, manager_id } = req.body;

	if (!hotelId) {
		return res.status(400).json({ error: 'Valid hotel id is required' });
	}

	if (!chain_id || !name || !rating || !address) {
		return res.status(400).json({ error: 'chain_id, name, rating, and address are required' });
	}

	try {
		const result = await pool.query(
			`UPDATE hotel
			 SET chain_id = $1,
				 name = $2,
				 rating = $3,
				 address = $4,
				 email = $5,
				 phone = $6,
				 manager_id = $7
			 WHERE hotel_id = $8
			 RETURNING *`,
			[chain_id, name, rating, address, email || null, phone || null, manager_id || null, hotelId]
		);

		if (!result.rows.length) {
			return res.status(404).json({ error: 'Hotel not found' });
		}

		res.json(result.rows[0]);
	} catch (error) {
		if (error.code === '23503') {
			return res.status(409).json({ error: 'Invalid chain or manager reference' });
		}
		throw error;
	}
}));

app.delete('/api/hotels/:id', asyncHandler(async (req, res) => {
	const hotelId = Number(req.params.id);

	if (!hotelId) {
		return res.status(400).json({ error: 'Valid hotel id is required' });
	}

	const result = await pool.query(
		'DELETE FROM hotel WHERE hotel_id = $1 RETURNING hotel_id',
		[hotelId]
	);

	if (!result.rows.length) {
		return res.status(404).json({ error: 'Hotel not found' });
	}

	res.json({ deleted: true });
}));

app.delete('/api/hotels/:id', asyncHandler(async (req, res) => {
	const result = await pool.query('DELETE FROM hotel WHERE hotel_id = $1 RETURNING hotel_id', [req.params.id]);
	if (!result.rows.length) {
		return res.status(404).json({ error: 'Hotel not found' });
	}
	res.json({ deleted: true });
}));

app.get('/api/rooms', asyncHandler(async (req, res) => {
	const result = await pool.query('SELECT * FROM room ORDER BY room_id');
	res.json(result.rows);
}));

app.post('/api/rooms', asyncHandler(async (req, res) => {
	const { hotel_id, room_number, price, capacity, view_type, extendable, status } = req.body;
	// Convert string 'true'/'false' to actual boolean
	const extendableValue = extendable === 'true' ? true : extendable === 'false' ? false : !!extendable;
	const result = await pool.query(
		`INSERT INTO room (hotel_id, room_number, price, capacity, view_type, extendable, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING *`,
		[hotel_id, room_number, price, capacity, view_type || null, extendableValue, status || 'Available']
	);
	res.status(201).json(result.rows[0]);
}));

app.put('/api/rooms/:id', asyncHandler(async (req, res) => {
	const { hotel_id, room_number, price, capacity, view_type, extendable, status } = req.body;
	// Convert string 'true'/'false' to actual boolean
	const extendableValue = extendable === 'true' ? true : extendable === 'false' ? false : (extendable !== undefined ? !!extendable : undefined);
	const result = await pool.query(
		`UPDATE room SET hotel_id = $1, room_number = $2, price = $3, capacity = $4, view_type = $5, extendable = $6, status = $7
		 WHERE room_id = $8 RETURNING *`,
		[hotel_id, room_number, price, capacity, view_type || null, extendableValue, status, req.params.id]
	);
	if (!result.rows.length) {
		return res.status(404).json({ error: 'Room not found' });
	}
	res.json(result.rows[0]);
}));

app.put('/api/rooms/:id', asyncHandler(async (req, res) => {
	const roomId = Number(req.params.id);
	const { hotel_id, room_number, price, capacity, view_type, extendable, status } = req.body;

	if (!roomId) {
		return res.status(400).json({ error: 'Valid room id is required' });
	}

	if (!hotel_id || !room_number || !price || !capacity) {
		return res.status(400).json({ error: 'hotel_id, room_number, price, and capacity are required' });
	}

	const extendableValue =
		extendable === 'true' ? true :
		extendable === 'false' ? false :
		(extendable !== undefined ? !!extendable : false);

	try {
		const result = await pool.query(
			`UPDATE room
			 SET hotel_id = $1,
				 room_number = $2,
				 price = $3,
				 capacity = $4,
				 view_type = $5,
				 extendable = $6,
				 status = $7
			 WHERE room_id = $8
			 RETURNING *`,
			[hotel_id, room_number, price, capacity, view_type || null, extendableValue, status || 'Available', roomId]
		);

		if (!result.rows.length) {
			return res.status(404).json({ error: 'Room not found' });
		}

		res.json(result.rows[0]);
	} catch (error) {
		if (error.code === '23503') {
			return res.status(409).json({ error: 'Invalid hotel reference' });
		}
		if (error.code === '23505') {
			return res.status(409).json({ error: 'A room with this number already exists in the selected hotel' });
		}
		throw error;
	}
}));

app.delete('/api/rooms/:id', asyncHandler(async (req, res) => {
	const roomId = Number(req.params.id);

	if (!roomId) {
		return res.status(400).json({ error: 'Valid room id is required' });
	}

	const result = await pool.query(
		'DELETE FROM room WHERE room_id = $1 RETURNING room_id',
		[roomId]
	);

	if (!result.rows.length) {
		return res.status(404).json({ error: 'Room not found' });
	}

	res.json({ deleted: true });
}));

app.post('/api/bookings', asyncHandler(async (req, res) => {
	const { room_id, cust_id, start_date, end_date } = req.body;

	// Validate dates
	const today = new Date().toISOString().split('T')[0];
	if (start_date < today) {
		return res.status(400).json({ error: 'Start date cannot be in the past' });
	}
	if (end_date <= start_date) {
		return res.status(400).json({ error: 'End date must be after start date' });
	}

	const result = await pool.query(
		`INSERT INTO booking (room_id, cust_id, start_date, end_date)
		 VALUES ($1, $2, $3, $4)
		 RETURNING *`,
		[room_id, cust_id, start_date, end_date]
	);
	res.status(201).json(result.rows[0]);
}));

app.get('/api/bookings', asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT * FROM booking ORDER BY start_date ASC');
    res.json(result.rows);
}));

app.get('/api/customers/:id/bookings', asyncHandler(async (req, res) => {
	const result = await pool.query(
		`SELECT b.book_id, b.start_date, b.end_date, r.room_number, h.name AS hotel_name, h.address
		 FROM booking b
		 JOIN room r ON b.room_id = r.room_id
		 JOIN hotel h ON r.hotel_id = h.hotel_id
		 WHERE b.cust_id = $1
		 ORDER BY b.start_date DESC`,
		[req.params.id]
	);
	res.json(result.rows);
}));

app.post('/api/bookings/:id/checkin', asyncHandler(async (req, res) => {
	const { emp_id, checkin_date, checkout_date } = req.body;
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const bookingResult = await client.query('SELECT * FROM booking WHERE book_id = $1 FOR UPDATE', [req.params.id]);
		if (!bookingResult.rows.length) {
			await client.query('ROLLBACK');
			return res.status(404).json({ error: 'Booking not found' });
		}
		const booking = bookingResult.rows[0];
		const rentingResult = await client.query(
			`INSERT INTO renting (book_id, room_id, cust_id, emp_id, checkin_date, checkout_date, amount_paid)
			 VALUES ($1, $2, $3, $4, $5, $6, 0)
			 RETURNING *`,
			[
				booking.book_id,
				booking.room_id,
				booking.cust_id,
				emp_id,
				checkin_date || booking.start_date,
				checkout_date || booking.end_date
			]
		);

		await client.query('DELETE FROM booking WHERE book_id = $1', [booking.book_id]);
		await client.query('COMMIT');
		res.json(rentingResult.rows[0]);
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}));

app.get('/api/rentings', asyncHandler(async (req, res) => {
	const result = await pool.query('SELECT * FROM renting ORDER BY rent_id');
	res.json(result.rows);
}));
// Get all Archived Bookings 
app.get('/api/archives/bookings', asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT * FROM Archive_Booking ORDER BY archive_id DESC');
    res.json(result.rows);
}));

// Get all Archived Rentings
app.get('/api/archives/rentings', asyncHandler(async (req, res) => {
    const result = await pool.query('SELECT * FROM Archive_Renting ORDER BY archive_id DESC');
    res.json(result.rows);
}));
app.post('/api/rentings/direct', asyncHandler(async (req, res) => {
	const { room_id, cust_id, emp_id, checkin_date, checkout_date, amount_paid } = req.body;
	const result = await pool.query(
		`INSERT INTO renting (book_id, room_id, cust_id, emp_id, checkin_date, checkout_date, amount_paid)
		 VALUES (NULL, $1, $2, $3, $4, $5, COALESCE($6, 0))
		 RETURNING *`,
		[room_id, cust_id, emp_id, checkin_date, checkout_date, amount_paid]
	);
	res.status(201).json(result.rows[0]);
}));

app.post('/api/rentings/:id/payments', asyncHandler(async (req, res) => {
	const { amount } = req.body;
	const result = await pool.query(
		'UPDATE renting SET amount_paid = amount_paid + $1 WHERE rent_id = $2 RETURNING *',
		[amount, req.params.id]
	);
	if (!result.rows.length) {
		return res.status(404).json({ error: 'Renting not found' });
	}
	res.json(result.rows[0]);
}));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});