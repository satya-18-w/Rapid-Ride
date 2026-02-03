package model

import "time"

// RideStatus represents the current status of a ride
type RideStatus string

const (
	RideStatusRequested     RideStatus = "requested"
	RideStatusAccepted      RideStatus = "accepted"
	RideStatusDriverArrived RideStatus = "driver_arrived"
	RideStatusInProgress    RideStatus = "in_progress"
	RideStatusCompleted     RideStatus = "completed"
	RideStatusCancelled     RideStatus = "cancelled"
)

// PaymentStatus represents the payment status of a ride
type PaymentStatus string

const (
	PaymentStatusPending   PaymentStatus = "pending"
	PaymentStatusCompleted PaymentStatus = "completed"
	PaymentStatusFailed    PaymentStatus = "failed"
)

// VehicleType represents the type of vehicle for a ride
type VehicleType string

const (
	VehicleTypeBike  VehicleType = "bike"
	VehicleTypeAuto  VehicleType = "auto"
	VehicleTypeSedan VehicleType = "sedan"
	VehicleTypeSUV   VehicleType = "suv"
)

// PaymentMethod represents the payment method for a ride
type PaymentMethod string

const (
	PaymentMethodCash   PaymentMethod = "cash"
	PaymentMethodUPI    PaymentMethod = "upi"
	PaymentMethodCard   PaymentMethod = "card"
	PaymentMethodWallet PaymentMethod = "wallet"
)

// Ride represents a ride in the system
type Ride struct {
	ID              string        `json:"id" db:"id"`
	UserID          string        `json:"user_id" db:"user_id"`
	DriverID        *string       `json:"driver_id,omitempty" db:"driver_id"`
	PickupLocation  Location      `json:"pickup_location"`
	PickupAddress   string        `json:"pickup_address" db:"pickup_address"`
	DropoffLocation Location      `json:"dropoff_location"`
	DropoffAddress  string        `json:"dropoff_address" db:"dropoff_address"`
	Status          RideStatus    `json:"status" db:"status"`
	VehicleType     VehicleType   `json:"vehicle_type" db:"vehicle_type"`
	PaymentMethod   PaymentMethod `json:"payment_method" db:"payment_method"`
	OTP             string        `json:"otp,omitempty" db:"otp"`
	Fare            *float64      `json:"fare,omitempty" db:"fare"`
	DistanceKm      *float64      `json:"distance_km,omitempty" db:"distance_km"`
	DurationMinutes *int          `json:"duration_minutes,omitempty" db:"duration_minutes"`
	RequestedAt     time.Time     `json:"requested_at" db:"requested_at"`
	AcceptedAt      *time.Time    `json:"accepted_at,omitempty" db:"accepted_at"`
	StartedAt       *time.Time    `json:"started_at,omitempty" db:"started_at"`
	CompletedAt     *time.Time    `json:"completed_at,omitempty" db:"completed_at"`
	PaymentStatus   PaymentStatus `json:"payment_status" db:"payment_status"`
	PaymentID       *string       `json:"payment_id,omitempty" db:"payment_id"`
	Rating          *int          `json:"rating,omitempty" db:"rating"`
	Feedback        *string       `json:"feedback,omitempty" db:"feedback"`
	CreatedAt       time.Time     `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time     `json:"updated_at" db:"updated_at"`
}

// RideRequest represents a request to create a new ride
type RideRequest struct {
	PickupLocation  Location      `json:"pickup_location" validate:"required"`
	PickupAddress   string        `json:"pickup_address" validate:"required,min=5,max=500"`
	DropoffLocation Location      `json:"dropoff_location" validate:"required"`
	DropoffAddress  string        `json:"dropoff_address" validate:"required,min=5,max=500"`
	VehicleType     VehicleType   `json:"vehicle_type" validate:"required,oneof=bike auto sedan suv"`
	PaymentMethod   PaymentMethod `json:"payment_method" validate:"required,oneof=cash upi card wallet"`
}

// RideResponse represents a ride with additional driver information
type RideResponse struct {
	ID              string        `json:"id"`
	Status          RideStatus    `json:"status"`
	PickupAddress   string        `json:"pickup_address"`
	DropoffAddress  string        `json:"dropoff_address"`
	PickupLocation  Location      `json:"pickup_location"`
	DropoffLocation Location      `json:"dropoff_location"`
	VehicleType     VehicleType   `json:"vehicle_type"`
	PaymentMethod   PaymentMethod `json:"payment_method"`
	OTP             string        `json:"otp,omitempty"`
	Fare            *float64      `json:"fare,omitempty"`
	DistanceKm      *float64      `json:"distance_km,omitempty"`
	DurationMinutes *int          `json:"duration_minutes,omitempty"`
	Driver          *DriverInfo   `json:"driver,omitempty"`
	RequestedAt     time.Time     `json:"requested_at"`
	AcceptedAt      *time.Time    `json:"accepted_at,omitempty"`
	StartedAt       *time.Time    `json:"started_at,omitempty"`
	CompletedAt     *time.Time    `json:"completed_at,omitempty"`
	PaymentStatus   PaymentStatus `json:"payment_status"`
	Rating          *int          `json:"rating,omitempty"`
	Feedback        *string       `json:"feedback,omitempty"`
}

// RideStartRequest represents a request to start a ride with OTP verification
type RideStartRequest struct {
	OTP string `json:"otp" validate:"required,len=4"`
}

// DriverInfo represents driver information for a ride
type DriverInfo struct {
	ID            string   `json:"id"`
	Name          string   `json:"name"`
	Phone         string   `json:"phone"`
	VehicleType   string   `json:"vehicle_type"`
	VehicleNumber string   `json:"vehicle_number"`
	Rating        float64  `json:"rating"`
	Location      Location `json:"location"`
}

// RideRatingRequest represents a request to rate a completed ride
type RideRatingRequest struct {
	Rating   int    `json:"rating" validate:"required,min=1,max=5"`
	Feedback string `json:"feedback,omitempty" validate:"omitempty,max=1000"`
}

// Validate methods
func (r *RideRequest) Validate() error {
	return nil
}

func (r *RideRatingRequest) Validate() error {
	return nil
}
