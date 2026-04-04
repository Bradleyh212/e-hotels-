CREATE OR REPLACE FUNCTION archive_booking_before_delete()
RETURNS TRIGGER AS $$
BEGIN
	INSERT INTO Archive_Booking (
		Old_Book_ID,
		Customer_Name,
		Customer_Address,
		Customer_ID_Type,
		Customer_ID_Number,
		Hotel_Name,
		Hotel_Address,
		Room_Number,
		Start_Date,
		End_Date
	)
	SELECT
		OLD.Book_ID,
		c.Full_Name,
		c.Address,
		c.ID_Type,
		c.ID_Number,
		h.Name,
		h.Address,
		r.Room_Number,
		OLD.Start_Date,
		OLD.End_Date
	FROM Customer c
	LEFT JOIN Room r ON r.Room_ID = OLD.Room_ID
	LEFT JOIN Hotel h ON h.Hotel_ID = r.Hotel_ID
	WHERE c.Cust_ID = OLD.Cust_ID;

	RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_archive_booking_before_delete
BEFORE DELETE ON Booking
FOR EACH ROW
EXECUTE FUNCTION archive_booking_before_delete();


CREATE OR REPLACE FUNCTION archive_renting_before_delete()
RETURNS TRIGGER AS $$
BEGIN
	INSERT INTO Archive_Renting (
		Old_Rent_ID,
		Customer_Name,
		Customer_Address,
		Customer_ID_Type,
		Customer_ID_Number,
		Hotel_Name,
		Hotel_Address,
		Room_Number,
		CheckIn_Date,
		CheckOut_Date,
		Amount_Paid
	)
	SELECT
		OLD.Rent_ID,
		c.Full_Name,
		c.Address,
		c.ID_Type,
		c.ID_Number,
		h.Name,
		h.Address,
		r.Room_Number,
		OLD.CheckIn_Date,
		OLD.CheckOut_Date,
		OLD.Amount_Paid
	FROM Customer c
	LEFT JOIN Room r ON r.Room_ID = OLD.Room_ID
	LEFT JOIN Hotel h ON h.Hotel_ID = r.Hotel_ID
	WHERE c.Cust_ID = OLD.Cust_ID;

	RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_archive_renting_before_delete
BEFORE DELETE ON Renting
FOR EACH ROW
EXECUTE FUNCTION archive_renting_before_delete();


CREATE OR REPLACE FUNCTION prevent_overlapping_booking()
RETURNS TRIGGER AS $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM Booking
		WHERE Room_ID = NEW.Room_ID
		  AND Book_ID <> COALESCE(NEW.Book_ID, -1)
		  AND NEW.Start_Date < End_Date
		  AND NEW.End_Date > Start_Date
	) THEN
		RAISE EXCEPTION 'This room is already booked for the selected date range.';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_prevent_overlapping_booking
BEFORE INSERT OR UPDATE ON Booking
FOR EACH ROW
EXECUTE FUNCTION prevent_overlapping_booking();