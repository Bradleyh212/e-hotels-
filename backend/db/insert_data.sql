-- 5 chains, each with 8 hotels (40 total), each hotel with 5 rooms of different capacities.

INSERT INTO HotelChain (Chain_ID, Office_Address, Name) VALUES
	(1, '100 Bay St, Toronto, ON', 'MapleStay Hotels'),
	(2, '200 Sainte-Catherine St, Montreal, QC', 'Northern Lights Inns'),
	(3, '300 Robson St, Vancouver, BC', 'Pacific Crown Hotels'),
	(4, '400 Jasper Ave, Edmonton, AB', 'Prairie View Resorts'),
	(5, '500 Spring Garden Rd, Halifax, NS', 'Atlantic Horizon Hotels');

INSERT INTO HotelChain_Email (Chain_ID, Email) VALUES
	(1, 'contact@maplestay.ca'), (1, 'support@maplestay.ca'),
	(2, 'contact@northernlights.ca'), (2, 'support@northernlights.ca'),
	(3, 'contact@pacificcrown.ca'), (3, 'support@pacificcrown.ca'),
	(4, 'contact@prairieview.ca'), (4, 'support@prairieview.ca'),
	(5, 'contact@atlantichorizon.ca'), (5, 'support@atlantichorizon.ca');

INSERT INTO HotelChain_Phone (Chain_ID, Phone) VALUES
	(1, '416-555-1000'), (1, '416-555-1001'),
	(2, '514-555-2000'), (2, '514-555-2001'),
	(3, '604-555-3000'), (3, '604-555-3001'),
	(4, '780-555-4000'), (4, '780-555-4001'),
	(5, '902-555-5000'), (5, '902-555-5001');

INSERT INTO Hotel (Hotel_ID, Chain_ID, Name, Rating, Address, Email, Phone, Manager_ID)
SELECT
	h,
	((h - 1) / 8) + 1,
	CASE h
		WHEN 1 THEN 'MapleStay Downtown Toronto'
		WHEN 2 THEN 'MapleStay Airport Toronto'
		WHEN 3 THEN 'MapleStay Niagara Falls'
		WHEN 4 THEN 'MapleStay Ottawa Central'
		WHEN 5 THEN 'MapleStay Kingston Harbor'
		WHEN 6 THEN 'MapleStay Montreal Old Port'
		WHEN 7 THEN 'MapleStay Quebec City Historic'
		WHEN 8 THEN 'MapleStay Vancouver Stanley Park'
		WHEN 9 THEN 'Northern Lights Montreal Downtown'
		WHEN 10 THEN 'Northern Lights Quebec City'
		WHEN 11 THEN 'Northern Lights Ottawa Parliament'
		WHEN 12 THEN 'Northern Lights Toronto Financial'
		WHEN 13 THEN 'Northern Lights Halifax Citadel'
		WHEN 14 THEN 'Northern Lights Calgary Stampede'
		WHEN 15 THEN 'Northern Lights Edmonton River Valley'
		WHEN 16 THEN 'Northern Lights Vancouver Granville'
		WHEN 17 THEN 'Pacific Crown Vancouver Downtown'
		WHEN 18 THEN 'Pacific Crown Whistler Mountain'
		WHEN 19 THEN 'Pacific Crown Victoria Inner Harbour'
		WHEN 20 THEN 'Pacific Crown Tofino Oceanfront'
		WHEN 21 THEN 'Pacific Crown Kelowna Lakeside'
		WHEN 22 THEN 'Pacific Crown Calgary Downtown'
		WHEN 23 THEN 'Pacific Crown Edmonton Capitol'
		WHEN 24 THEN 'Pacific Crown Prince George'
		WHEN 25 THEN 'Prairie View Calgary Heritage'
		WHEN 26 THEN 'Prairie View Edmonton Gateway'
		WHEN 27 THEN 'Prairie View Regina Wascana'
		WHEN 28 THEN 'Prairie View Saskatoon River Landing'
		WHEN 29 THEN 'Prairie View Winnipeg Forks'
		WHEN 30 THEN 'Prairie View Thunder Bay'
		WHEN 31 THEN 'Prairie View Brandon University'
		WHEN 32 THEN 'Prairie View Medicine Hat'
		WHEN 33 THEN 'Atlantic Horizon Halifax Waterfront'
		WHEN 34 THEN 'Atlantic Horizon St. John''s Signal Hill'
		WHEN 35 THEN 'Atlantic Horizon Charlottetown Founders'' Hall'
		WHEN 36 THEN 'Atlantic Horizon Fredericton Beaverbrook'
		WHEN 37 THEN 'Atlantic Horizon Moncton Tidal Bore'
		WHEN 38 THEN 'Atlantic Horizon Sydney Fortress'
		WHEN 39 THEN 'Atlantic Horizon Corner Brook'
		WHEN 40 THEN 'Atlantic Horizon Stephenville'
		ELSE 'Hotel ' || h
	END,
	((h - 1) % 5) + 1,
	(100 + h) || ' Main St, ' ||
	CASE (h % 8)
		WHEN 0 THEN 'Ottawa, ON'
		WHEN 1 THEN 'Toronto, ON'
		WHEN 2 THEN 'Montreal, QC'
		WHEN 3 THEN 'Vancouver, BC'
		WHEN 4 THEN 'Calgary, AB'
		WHEN 5 THEN 'Halifax, NS'
		WHEN 6 THEN 'Moncton, NB'
		ELSE 'Quebec City, QC'
	END,
	'hotel' || h || '@ehotels.ca',
	'555-01' || LPAD(h::text, 2, '0'),
	NULL
FROM generate_series(1, 40) h;

INSERT INTO Employee (Emp_ID, Hotel_ID, SSN_SIN, Full_Name, Address, Role)
SELECT
	((h - 1) * 3) + e,
	h,
	'SIN' || LPAD((((h - 1) * 3) + e)::text, 6, '0'),
	'Employee ' || (((h - 1) * 3) + e),
	'Address ' || (((h - 1) * 3) + e),
	CASE e WHEN 1 THEN 'Manager' WHEN 2 THEN 'Receptionist' ELSE 'Clerk' END
FROM generate_series(1, 40) h
CROSS JOIN generate_series(1, 3) e;

UPDATE Hotel
SET Manager_ID = ((Hotel_ID - 1) * 3) + 1;

INSERT INTO Customer (Cust_ID, Full_Name, Address, ID_Type, ID_Number, Registration_Date)
SELECT
	c,
	'Customer ' || c,
	'Customer Address ' || c,
	CASE WHEN c % 3 = 0 THEN 'Passport' WHEN c % 3 = 1 THEN 'Driver License' ELSE 'Health Card' END,
	'CID-' || LPAD(c::text, 5, '0'),
	DATE '2026-01-01' + (c % 90)
FROM generate_series(1, 50) c;

INSERT INTO App_User (Username, Password_Hash, Role, Cust_ID)
VALUES
	('customer1', 'demo123', 'customer', 1),
	('customer2', 'demo123', 'customer', 2),
	('customer3', 'demo123', 'customer', 3);

INSERT INTO App_User (Username, Password_Hash, Role, Emp_ID)
VALUES
	('employee2', 'demo123', 'employee', 2),
	('employee5', 'demo123', 'employee', 5),
	('employee8', 'demo123', 'employee', 8);

INSERT INTO Room (Room_ID, Hotel_ID, Room_Number, Price, Capacity, View_Type, Extendable, Status)
SELECT
	((h - 1) * 5) + r,
	h,
	CASE r WHEN 1 THEN '101' WHEN 2 THEN '102' WHEN 3 THEN '201' WHEN 4 THEN '202' ELSE '301' END,
	ROUND((90 + (h * 2) + (r * 30))::numeric, 2),
	CASE r WHEN 1 THEN 'Single' WHEN 2 THEN 'Double' WHEN 3 THEN 'Suite' WHEN 4 THEN 'Family' ELSE 'Deluxe' END,
	CASE r WHEN 1 THEN 'City' WHEN 2 THEN 'City' WHEN 3 THEN 'Mountain' WHEN 4 THEN 'Sea' ELSE 'City' END,
	(r IN (2, 3, 4)),
	'Available'
FROM generate_series(1, 40) h
CROSS JOIN generate_series(1, 5) r;

INSERT INTO Amenity (Amenity_ID, Name) VALUES
	(1, 'WiFi'),
	(2, 'TV'),
	(3, 'Air Conditioning'),
	(4, 'Mini Fridge'),
	(5, 'Balcony');

INSERT INTO RoomHasAmenity (Room_ID, Amenity_ID)
SELECT r.Room_ID, a.Amenity_ID
FROM Room r
JOIN Amenity a ON a.Amenity_ID <=
	CASE r.Capacity
		WHEN 'Single' THEN 3
		WHEN 'Double' THEN 4
		WHEN 'Suite' THEN 5
		WHEN 'Family' THEN 4
		ELSE 5
	END;

INSERT INTO Booking (Book_ID, Room_ID, Cust_ID, Start_Date, End_Date)
SELECT
	b,
	b,
	((b - 1) % 50) + 1,
	DATE '2026-04-01' + ((b - 1) * 2),
	DATE '2026-04-01' + ((b - 1) * 2) + 2
FROM generate_series(1, 30) b;

INSERT INTO Renting (Rent_ID, Book_ID, Room_ID, Cust_ID, Emp_ID, CheckIn_Date, CheckOut_Date, Amount_Paid)
SELECT
	r,
	CASE WHEN r <= 12 THEN r ELSE NULL END,
	CASE WHEN r <= 12 THEN r ELSE 60 + r END,
	((r - 1) % 50) + 1,
	((((CASE WHEN r <= 12 THEN r ELSE 60 + r END) - 1) % 40) * 3) + 2,
	DATE '2026-03-01' + (r * 2),
	DATE '2026-03-01' + (r * 2) + 2,
	ROUND((150 + r * 20)::numeric, 2)
FROM generate_series(1, 20) r;

-- Keep sequences in sync after explicit PK inserts
SELECT setval(pg_get_serial_sequence('hotelchain', 'chain_id'), COALESCE((SELECT MAX(chain_id) FROM hotelchain), 1));
SELECT setval(pg_get_serial_sequence('hotel', 'hotel_id'), COALESCE((SELECT MAX(hotel_id) FROM hotel), 1));
SELECT setval(pg_get_serial_sequence('employee', 'emp_id'), COALESCE((SELECT MAX(emp_id) FROM employee), 1));
SELECT setval(pg_get_serial_sequence('customer', 'cust_id'), COALESCE((SELECT MAX(cust_id) FROM customer), 1));
SELECT setval(pg_get_serial_sequence('room', 'room_id'), COALESCE((SELECT MAX(room_id) FROM room), 1));
SELECT setval(pg_get_serial_sequence('amenity', 'amenity_id'), COALESCE((SELECT MAX(amenity_id) FROM amenity), 1));
SELECT setval(pg_get_serial_sequence('booking', 'book_id'), COALESCE((SELECT MAX(book_id) FROM booking), 1));
SELECT setval(pg_get_serial_sequence('renting', 'rent_id'), COALESCE((SELECT MAX(rent_id) FROM renting), 1));
SELECT setval(pg_get_serial_sequence('archive_booking', 'archive_id'), COALESCE((SELECT MAX(archive_id) FROM archive_booking), 1));
SELECT setval(pg_get_serial_sequence('archive_renting', 'archive_id'), COALESCE((SELECT MAX(archive_id) FROM archive_renting), 1));
SELECT setval(pg_get_serial_sequence('app_user', 'user_id'), COALESCE((SELECT MAX(user_id) FROM app_user), 1));
