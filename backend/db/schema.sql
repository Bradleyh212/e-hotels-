DROP TABLE IF EXISTS room CASCADE;
DROP TABLE IF EXISTS hotel CASCADE;

CREATE TABLE hotel (
	hotel_id SERIAL PRIMARY KEY,
	name TEXT,
	city TEXT
);

CREATE TABLE room (
	room_id SERIAL PRIMARY KEY,
	hotel_id INT REFERENCES hotel(hotel_id),
	price NUMERIC,
	capacity TEXT
);