-- 1

SELECT
	h.Name AS hotel_name,
	h.Address,
	h.Rating,
	r.Room_Number,
	r.Capacity,
	r.View_Type,
	r.Price
FROM Room r
JOIN Hotel h ON r.Hotel_ID = h.Hotel_ID
WHERE h.Address ILIKE '%Ottawa%'
  AND r.Capacity = 'Single'
  AND r.Price <= 200
  AND r.Room_ID NOT IN (
		SELECT b.Room_ID
		FROM Booking b
		WHERE DATE '2026-04-11' < b.End_Date
		  AND DATE '2026-04-12' > b.Start_Date
  )
  AND r.Room_ID NOT IN (
		SELECT rt.Room_ID
		FROM Renting rt
		WHERE DATE '2026-04-11' < rt.CheckOut_Date
		  AND DATE '2026-04-12' > rt.CheckIn_Date
  );


-- 2

  SELECT
	h.Hotel_ID,
	h.Name AS hotel_name,
	COUNT(r.Room_ID) AS total_rooms
FROM Hotel h
LEFT JOIN Room r ON h.Hotel_ID = r.Hotel_ID
GROUP BY h.Hotel_ID, h.Name
ORDER BY total_rooms DESC;

-- 3

SELECT DISTINCT
	c.Cust_ID,
	c.Full_Name,
	c.ID_Type,
	c.ID_Number
FROM Customer c
JOIN Booking b ON c.Cust_ID = b.Cust_ID
JOIN Room r ON b.Room_ID = r.Room_ID
WHERE r.Price = (
	SELECT MAX(Price)
	FROM Room
);

-- 4

SELECT
	e.Emp_ID,
	e.Full_Name,
	h.Name AS hotel_name,
	COUNT(rt.Rent_ID) AS total_rentings_processed,
	SUM(rt.Amount_Paid) AS total_revenue_handled
FROM Employee e
JOIN Hotel h ON e.Hotel_ID = h.Hotel_ID
LEFT JOIN Renting rt ON e.Emp_ID = rt.Emp_ID
GROUP BY e.Emp_ID, e.Full_Name, h.Name
ORDER BY total_revenue_handled DESC NULLS LAST;