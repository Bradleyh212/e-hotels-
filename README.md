Setup Instructions
	1.	Configure environment variables

Copy the example file:
cp .env.example .env

Then open the .env file and enter your PostgreSQL credentials:

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=e_hotels
PORT=3000

Note: `backend/setup.sh` will automatically use this root `.env` (it copies it to `backend/.env` if needed).
	2.	Make scripts executable

Run the following command once:
chmod +x start.sh backend/setup.sh

Run the Application

Start everything with one command:
./start.sh

What the script does

The start script will automatically:
	•	Reset the database
	•	Create all tables
	•	Insert sample data
	•	Create views, indexes, and triggers
	•	Start the backend server (Express API)
	•	Start the frontend server

Access the Application

Frontend:
http://localhost:5500

Backend API:
http://localhost:3000

Notes
	•	Make sure PostgreSQL is running before starting the application:
brew services start postgresql
	•	If the .env file is not configured correctly, the database connection will fail.

Tech Stack

Frontend: HTML, CSS, JavaScript
Backend: Node.js, Express
Database: PostgreSQL