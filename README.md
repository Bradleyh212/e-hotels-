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

	2. Install PostgreSQL
	Make sure PostgreSQL is installed and running. On **Mac**, run `brew install postgresql` and `brew services start postgresql`. On **Windows**, download and install PostgreSQL from the official website, ensure `psql` is in your PATH, and start PostgreSQL via Services or pgAdmin.

3. Make Scripts Executable

Run the following command once:

Mac / Linux:
chmod +x start.sh backend/setup.sh

Windows (Git Bash / WSL):
chmod +x start.sh backend/setup.sh
(Note: In PowerShell or CMD, this is not needed; use `bash start.sh` instead.)

## Run the Application

Start everything with one command:

Mac / Linux or Git Bash / WSL:
./start.sh
or
bash start.sh

Windows PowerShell / CMD:
bash start.sh

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

Final Scope Checklist

Keep
	•	One role-first flow: Customer or Employee
	•	Role login, then role-specific create account page
	•	Customer actions: search rooms, book rooms, update own info, delete own account
	•	Employee actions: check-in booking to renting, direct renting, insert payment
	•	CRUD for customers, employees, hotels, and rooms
	•	The 2 required SQL views
	•	Queries, triggers, indexes, and seeded data

Remove or avoid
	•	Extra roles beyond customer and employee
	•	Unrelated admin concepts that are not in the rubric
	•	Duplicate or overlapping UI pages
	•	Any feature that does not support booking, renting, account management, or required reports/views

Priority
	1.	Keep the database and UI aligned with the assignment wording
	2.	Keep customer and employee actions clearly separated
	3.	Keep the app simple and user friendly
	4.	Use the same dataset and terminology throughout the report, video, and UI