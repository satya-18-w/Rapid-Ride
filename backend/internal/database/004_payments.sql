
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES rides(id),
    user_id UUID NOT NULL REFERENCES users(id),
    
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    
    status VARCHAR(20) NOT NULL CHECK (status IN (
        'created', 'pending', 'authorized', 
        'captured', 'failed', 'refunded'
    )) DEFAULT 'created',
    
    payment_method VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_ride ON payments(ride_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_razorpay_order ON payments(razorpay_order_id);

CREATE TRIGGER set_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

---- create above / drop below ----

DROP TABLE IF EXISTS payments;



CREATE UNIQUE INDEX unique_active_driver
ON rides(driver_id)
WHERE status IN ('accepted','driver_arrived','in_progress');

CREATE UNIQUE INDEX unique_active_user
ON rides(user_id)
WHERE status IN ('requested','accepted','driver_arrived','in_progress');
