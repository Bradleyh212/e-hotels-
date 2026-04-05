-- Enable GIST extension for date range constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE HotelChain (
    Chain_ID SERIAL PRIMARY KEY,
    Office_Address VARCHAR(255) NOT NULL,
    Name VARCHAR(100) NOT NULL
);

CREATE TABLE HotelChain_Email (
    Chain_ID INT REFERENCES HotelChain(Chain_ID) ON DELETE CASCADE,
    Email VARCHAR(100) NOT NULL,
    PRIMARY KEY (Chain_ID, Email)
);

CREATE TABLE HotelChain_Phone (
    Chain_ID INT REFERENCES HotelChain(Chain_ID) ON DELETE CASCADE,
    Phone VARCHAR(20) NOT NULL,
    PRIMARY KEY (Chain_ID, Phone)
);

CREATE TABLE Hotel (
    Hotel_ID SERIAL PRIMARY KEY,
    Chain_ID INT NOT NULL REFERENCES HotelChain(Chain_ID) ON DELETE CASCADE,
    Name VARCHAR(100) NOT NULL,
    Rating INT CHECK (Rating BETWEEN 1 AND 5),
    Address VARCHAR(255) NOT NULL,
    Email VARCHAR(100),
    Phone VARCHAR(20),
    Manager_ID INT
);

CREATE TABLE Employee (
    Emp_ID SERIAL PRIMARY KEY,
    Hotel_ID INT NOT NULL REFERENCES Hotel(Hotel_ID) ON DELETE CASCADE,
    SSN_SIN VARCHAR(20) UNIQUE NOT NULL,
    Full_Name VARCHAR(100) NOT NULL,
    Address VARCHAR(255),
    Role VARCHAR(50)
);

ALTER TABLE Hotel
ADD CONSTRAINT fk_hotel_manager
FOREIGN KEY (Manager_ID) REFERENCES Employee(Emp_ID);

CREATE TABLE Customer (
    Cust_ID SERIAL PRIMARY KEY,
    Full_Name VARCHAR(100) NOT NULL,
    Address VARCHAR(255),
    ID_Type VARCHAR(50) NOT NULL,
    ID_Number VARCHAR(50) NOT NULL,
    Registration_Date DATE DEFAULT CURRENT_DATE,
    CONSTRAINT unique_customer_id UNIQUE (ID_Type, ID_Number)
);

CREATE TABLE App_User (
    User_ID SERIAL PRIMARY KEY,
    Username VARCHAR(50) UNIQUE NOT NULL,
    Password_Hash VARCHAR(255) NOT NULL,
    Role VARCHAR(20) NOT NULL CHECK (Role IN ('customer', 'employee')),
    Cust_ID INT REFERENCES Customer(Cust_ID) ON DELETE CASCADE,
    Emp_ID INT REFERENCES Employee(Emp_ID) ON DELETE CASCADE,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (Role = 'customer' AND Cust_ID IS NOT NULL AND Emp_ID IS NULL)
        OR
        (Role = 'employee' AND Emp_ID IS NOT NULL AND Cust_ID IS NULL)
    )
);

CREATE TABLE Room (
    Room_ID SERIAL PRIMARY KEY,
    Hotel_ID INT NOT NULL REFERENCES Hotel(Hotel_ID) ON DELETE CASCADE,
    Room_Number VARCHAR(20) NOT NULL,
    Price DECIMAL(10,2) NOT NULL CHECK (Price > 0),
    Capacity VARCHAR(50) NOT NULL,
    View_Type VARCHAR(50),
    Extendable BOOLEAN DEFAULT FALSE,
    Status VARCHAR(20) DEFAULT 'Available',
    UNIQUE (Hotel_ID, Room_Number)
);

CREATE TABLE Amenity (
    Amenity_ID SERIAL PRIMARY KEY,
    Name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE RoomHasAmenity (
    Room_ID INT REFERENCES Room(Room_ID) ON DELETE CASCADE,
    Amenity_ID INT REFERENCES Amenity(Amenity_ID) ON DELETE CASCADE,
    PRIMARY KEY (Room_ID, Amenity_ID)
);

CREATE TABLE Booking (
    Book_ID SERIAL PRIMARY KEY,
    Room_ID INT NOT NULL REFERENCES Room(Room_ID),
    Cust_ID INT NOT NULL REFERENCES Customer(Cust_ID),
    Start_Date DATE NOT NULL,
    End_Date DATE NOT NULL,
    CHECK (Start_Date < End_Date)
);

-- Prevent double-booking: no overlapping date ranges for same room
ALTER TABLE Booking
ADD CONSTRAINT no_overlapping_bookings
EXCLUDE (room_id WITH =, daterange(start_date, end_date, '[]') WITH &&) USING GIST;

CREATE TABLE Renting (
    Rent_ID SERIAL PRIMARY KEY,
    -- ADD 'ON DELETE SET NULL' so the renting survives when booking is deleted
    Book_ID INT REFERENCES Booking(Book_ID) ON DELETE SET NULL, 
    Room_ID INT NOT NULL REFERENCES Room(Room_ID),
    Cust_ID INT NOT NULL REFERENCES Customer(Cust_ID),
    Emp_ID INT NOT NULL REFERENCES Employee(Emp_ID),
    CheckIn_Date DATE NOT NULL,
    CheckOut_Date DATE NOT NULL,
    Amount_Paid DECIMAL(10,2) DEFAULT 0.00 CHECK (Amount_Paid >= 0),
    CHECK (CheckIn_Date < CheckOut_Date)
);

CREATE TABLE Archive_Booking (
    Archive_ID SERIAL PRIMARY KEY,
    Old_Book_ID INT,
    Customer_Name VARCHAR(100),
    Customer_Address VARCHAR(255),
    Customer_ID_Type VARCHAR(50),
    Customer_ID_Number VARCHAR(50),
    Hotel_Name VARCHAR(100),
    Hotel_Address VARCHAR(255),
    Room_Number VARCHAR(20),
    Start_Date DATE,
    End_Date DATE
);

CREATE TABLE Archive_Renting (
    Archive_ID SERIAL PRIMARY KEY,
    Old_Rent_ID INT,
    Customer_Name VARCHAR(100),
    Customer_Address VARCHAR(255),
    Customer_ID_Type VARCHAR(50),
    Customer_ID_Number VARCHAR(50),
    Hotel_Name VARCHAR(100),
    Hotel_Address VARCHAR(255),
    Room_Number VARCHAR(20),
    CheckIn_Date DATE,
    CheckOut_Date DATE,
    Amount_Paid DECIMAL(10,2)
);