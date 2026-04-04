# Deliverable 2 Report (Template)

## a) Technologies Used
- DBMS: PostgreSQL
- Backend: Node.js + Express
- Frontend: HTML/CSS/JavaScript

## b) Installation Steps
1. Copy environment file:
   - `cp .env.example .env`
2. Set PostgreSQL credentials in `.env`
3. Make scripts executable:
   - `chmod +x start.sh backend/setup.sh`
4. Start app:
   - `./start.sh`

## c) DDL List (Database Creation SQL)
- `../../backend/db/schema.sql`
- `../../backend/db/triggers.sql`
- `../../backend/db/views.sql`
- `../../backend/db/indexes.sql`

## SQL Functionalities Included
- Data population: `../../backend/db/insert_data.sql`
- Queries: `../../backend/db/queries.sql`
- Triggers: `../../backend/db/triggers.sql`
- Indexes: `../../backend/db/indexes.sql`
- Views: `../../backend/db/views.sql`

## API + UI Coverage Summary
- Room availability search with multi-criteria
- Booking creation
- Booking-to-renting conversion
- Direct renting
- Payment insertion for renting
- CRUD for customers, employees, hotels, rooms
- UI display for required SQL views

## Submission Checklist
- [ ] Zip includes full source code
- [ ] Zip includes SQL files
- [ ] Zip includes this report exported to PDF if required
- [ ] MP4 video (10-15 min, <=30MB)
- [ ] Filled Table 1 PDF
