


-- Enable PostGIS extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS drivers(
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vechile_type VARCHAR(50) NOT NULL CHECK (vechile_type IN ('bike',
    'car','auto','suv')),

    vechile_number VARCHAR(50) UNIQUE NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    rating NUMERIC(3,2) DEFAULT 5.0,
    capasity INT DEFAULT 1,
    total_rides INT DEFAULT 0,
    location GEOGRAPHY(Point, 4326)
    
);


CREATE INDEX idx_drivers_location ON drivers USING GIST(location);

CREATE TRIGGER set_drivers_updated_at
BEFORE UPDATE ON drivers
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();