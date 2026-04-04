# Deliverable 1 Report (Template)

## 1. ER Diagram
- File: `../../erDiagram.mmd`
- Brief justification:
  - `HotelChain -> Hotel -> Room` ensures no room exists without hotel and no hotel exists without chain.
  - Booking and renting entities model reservation lifecycle.
  - Archive tables preserve historical booking/renting snapshots.

## 2. Relational Database Schema
- Main DDL file: `../../backend/db/schema.sql`
- Brief justification:
  - Separate tables for chain emails/phones support multiple contacts.
  - `Manager_ID` in `Hotel` enforces each hotel can reference a manager employee.
  - Bridge table `RoomHasAmenity` models many-to-many between rooms and amenities.

## 3. Integrity Constraints
- PK/FK constraints: in `../../backend/db/schema.sql`
- Domain/attribute constraints:
  - `Hotel.Rating BETWEEN 1 AND 5`
  - Positive room price
  - Date ordering for booking/renting
- User-defined constraints/triggers: `../../backend/db/triggers.sql`
  - Prevent overlapping bookings
  - Archive booking and renting data before deletion

## Notes
- Add screenshots of ERD and selected SQL snippets in the final submission PDF.
