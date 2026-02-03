
-- Enable PostGIS extension for geospatial data
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    driver_id UUID REFERENCES drivers(id),
    
    pickup_location GEOGRAPHY(Point, 4326) NOT NULL,
    pickup_address TEXT NOT NULL,
    dropoff_location GEOGRAPHY(Point, 4326) NOT NULL,
    dropoff_address TEXT NOT NULL,
    
    status VARCHAR(20) NOT NULL CHECK (status IN (
        'requested', 'accepted', 'driver_arrived', 
        'in_progress', 'completed', 'cancelled'
    )) DEFAULT 'requested',
    
    fare DECIMAL(10,2),
    distance_km DECIMAL(10,2),
    duration_minutes INT,
    
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_id VARCHAR(100),
    
    rating INT CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rides_user ON rides(user_id);
CREATE INDEX idx_rides_driver ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_pickup ON rides USING GIST(pickup_location);
CREATE INDEX idx_rides_dropoff ON rides USING GIST(dropoff_location);
CREATE INDEX idx_rides_requested_at ON rides(requested_at);

CREATE TRIGGER set_rides_updated_at
BEFORE UPDATE ON rides
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

---- create above / drop below ----

DROP TABLE IF EXISTS rides;
