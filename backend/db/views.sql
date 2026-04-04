-- =========================
-- View 1: Number of available rooms per area
-- Description: shows how many rooms are currently marked available in each area
-- =========================
CREATE OR REPLACE VIEW view_available_rooms_per_area AS
SELECT
	h.Address AS area,
	COUNT(r.Room_ID) AS available_rooms
FROM Hotel h
JOIN Room r ON h.Hotel_ID = r.Hotel_ID
WHERE r.Status = 'Available'
GROUP BY h.Address
ORDER BY available_rooms DESC;


-- =========================
-- View 2: Aggregated capacity of all rooms of a specific hotel
-- Description: shows the total number of rooms per capacity type for each hotel
-- =========================
CREATE OR REPLACE VIEW view_hotel_capacity AS
SELECT
	h.Hotel_ID,
	h.Name AS hotel_name,
	r.Capacity,
	COUNT(r.Room_ID) AS total_rooms
FROM Hotel h
JOIN Room r ON h.Hotel_ID = r.Hotel_ID
GROUP BY h.Hotel_ID, h.Name, r.Capacity
ORDER BY h.Hotel_ID, r.Capacity;