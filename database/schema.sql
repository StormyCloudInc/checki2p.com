-- Schema for Reseed Server Status
-- For use with Neon PostgreSQL database

CREATE TABLE IF NOT EXISTS server_status (
    id SERIAL PRIMARY KEY,
    server_name VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('online', 'offline', 'warning')),
    status_message TEXT,
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    first_offline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster queries
CREATE INDEX idx_server_status ON server_status(status);
CREATE INDEX idx_server_name ON server_status(server_name);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_server_status_updated_at BEFORE UPDATE
    ON server_status FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data (remove in production)
/*
INSERT INTO server_status (server_name, status, status_message) VALUES
    ('reseed.stormycloud.org', 'online', 'Server is operational'),
    ('reseed.acetone.i2p', 'online', 'Server is operational'),
    ('reseed.novg.net', 'warning', 'High latency detected'),
    ('reseed.backup.i2p', 'offline', 'Connection timeout');
*/