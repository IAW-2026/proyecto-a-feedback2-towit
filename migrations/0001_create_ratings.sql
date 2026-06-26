CREATE TABLE IF NOT EXISTS ratings (
    id SERIAL PRIMARY KEY,
    trip_id INTEGER NOT NULL,
    rater_clerk_id VARCHAR(255) NOT NULL,
    rated_clerk_id VARCHAR(255) NOT NULL,
    rating INTEGER NOT NULL,
    tags TEXT,
    comment TEXT,
    type TEXT NOT NULL CHECK (type IN ('tower_to_customer', 'customer_to_tower')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);