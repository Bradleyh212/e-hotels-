#!/bin/bash

set -e

if [ ! -f .env ]; then
	if [ -f ../.env ]; then
		cp ../.env .env
		echo "Using ../.env for backend configuration."
	else
		echo "Missing backend/.env file. Copy backend/.env.example to backend/.env and set credentials."
		exit 1
	fi
fi

set -a
source .env
set +a

export PGPASSWORD="$DB_PASSWORD"

echo "Ensuring database exists..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1; then
	createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
	echo "Created database: $DB_NAME"
fi

echo "Resetting database..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/reset.sql

echo "Creating schema..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/schema.sql

echo "Inserting data..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/insert_data.sql

echo "Creating views..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/views.sql

echo "Creating indexes..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/indexes.sql

echo "Creating triggers..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f db/triggers.sql

echo "Database setup complete."