-- Index 1: Speed up room search by hotel and price
CREATE INDEX idx_room_hotel_price
ON Room (Hotel_ID, Price);

-- Index 2: Speed up booking overlap checks
CREATE INDEX idx_booking_room_dates
ON Booking (Room_ID, Start_Date, End_Date);

-- Index 3: Speed up employee revenue query
CREATE INDEX idx_renting_employee
ON Renting (Emp_ID);