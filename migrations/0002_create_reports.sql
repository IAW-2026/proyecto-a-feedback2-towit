CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    trip_id VARCHAR(255) NOT NULL,
    reporter_clerk_id VARCHAR(255) NOT NULL,
    reported_clerk_id VARCHAR(255) NOT NULL,
    service_id VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    status VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);