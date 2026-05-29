CREATE TABLE IF NOT EXISTS trips (
    trip_id      SERIAL PRIMARY KEY,
    customer_id  VARCHAR(255) NOT NULL,
    tower_id     VARCHAR(255) NOT NULL,
    vehicle      TEXT NOT NULL,
    date         DATE NOT NULL,
    time         TIME NOT NULL
);
