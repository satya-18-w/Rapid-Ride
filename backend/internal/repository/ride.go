package repository

import (
	"context"
	"fmt"

	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
)

type RideRepository struct {
	server *server.Server
}

func NewRideRepository(s *server.Server) *RideRepository {
	return &RideRepository{server: s}
}

// Create creates a new ride request
func (r *RideRepository) Create(ctx context.Context, ride *model.Ride) error {
	query := `
		INSERT INTO rides (
			id, user_id, pickup_location, pickup_address,
			dropoff_location, dropoff_address, status, payment_status
		) VALUES (
			gen_random_uuid(), $1,
			ST_SetSRID(ST_MakePoint($2, $3), 4326),
			$4,
			ST_SetSRID(ST_MakePoint($5, $6), 4326),
			$7, $8, $9
		)
		RETURNING id, requested_at, created_at, updated_at
	`

	err := r.server.DB.Pool.QueryRow(
		ctx, query,
		ride.UserID,
		ride.PickupLocation.Longitude, ride.PickupLocation.Latitude,
		ride.PickupAddress,
		ride.DropoffLocation.Longitude, ride.DropoffLocation.Latitude,
		ride.DropoffAddress,
		ride.Status,
		ride.PaymentStatus,
	).Scan(&ride.ID, &ride.RequestedAt, &ride.CreatedAt, &ride.UpdatedAt)

	if err != nil {
		r.server.Logger.Error().Err(err).Msg("Failed to create ride")
		return fmt.Errorf("failed to create ride: %w", err)
	}

	return nil
}

// GetByID retrieves a ride by ID
func (r *RideRepository) GetByID(ctx context.Context, rideID string) (*model.Ride, error) {
	query := `
		SELECT 
			id, user_id, driver_id,
			ST_Y(pickup_location::geometry) as pickup_lat,
			ST_X(pickup_location::geometry) as pickup_lng,
			pickup_address,
			ST_Y(dropoff_location::geometry) as dropoff_lat,
			ST_X(dropoff_location::geometry) as dropoff_lng,
			dropoff_address,
			status, fare, distance_km, duration_minutes,
			requested_at, accepted_at, started_at, completed_at,
			payment_status, payment_id, rating, feedback,
			created_at, updated_at
		FROM rides
		WHERE id = $1
	`

	var ride model.Ride
	var pickupLat, pickupLng, dropoffLat, dropoffLng float64

	err := r.server.DB.Pool.QueryRow(ctx, query, rideID).Scan(
		&ride.ID, &ride.UserID, &ride.DriverID,
		&pickupLat, &pickupLng, &ride.PickupAddress,
		&dropoffLat, &dropoffLng, &ride.DropoffAddress,
		&ride.Status, &ride.Fare, &ride.DistanceKm, &ride.DurationMinutes,
		&ride.RequestedAt, &ride.AcceptedAt, &ride.StartedAt, &ride.CompletedAt,
		&ride.PaymentStatus, &ride.PaymentID, &ride.Rating, &ride.Feedback,
		&ride.CreatedAt, &ride.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get ride: %w", err)
	}

	ride.PickupLocation = model.Location{Latitude: pickupLat, Longitude: pickupLng}
	ride.DropoffLocation = model.Location{Latitude: dropoffLat, Longitude: dropoffLng}

	return &ride, nil
}

// UpdateStatus updates the status of a ride
func (r *RideRepository) UpdateStatus(ctx context.Context, rideID string, status model.RideStatus) error {
	query := `
		UPDATE rides 
		SET status = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	result, err := r.server.DB.Pool.Exec(ctx, query, status, rideID)
	if err != nil {
		return fmt.Errorf("failed to update ride status: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("ride not found")
	}

	return nil
}

// AssignDriver assigns a driver to a ride
func (r *RideRepository) AssignDriver(ctx context.Context, rideID, driverID string) error {
	query := `
		UPDATE rides 
		SET driver_id = $1, 
		    status = $2,
		    accepted_at = CURRENT_TIMESTAMP,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $3 AND status = $4
	`

	result, err := r.server.DB.Pool.Exec(ctx, query, driverID, model.RideStatusAccepted, rideID, model.RideStatusRequested)
	if err != nil {
		return fmt.Errorf("failed to assign driver: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("ride not available for acceptance")
	}

	return nil
}

// GetActiveRideForUser gets the active ride for a user
func (r *RideRepository) GetActiveRideForUser(ctx context.Context, userID string) (*model.Ride, error) {
	query := `
		SELECT 
			id, user_id, driver_id,
			ST_Y(pickup_location::geometry) as pickup_lat,
			ST_X(pickup_location::geometry) as pickup_lng,
			pickup_address,
			ST_Y(dropoff_location::geometry) as dropoff_lat,
			ST_X(dropoff_location::geometry) as dropoff_lng,
			dropoff_address,
			status, fare, distance_km, duration_minutes,
			requested_at, accepted_at, started_at, completed_at,
			payment_status, payment_id, rating, feedback,
			created_at, updated_at
		FROM rides
		WHERE user_id = $1 
		  AND status IN ($2, $3, $4, $5)
		ORDER BY requested_at DESC
		LIMIT 1
	`

	var ride model.Ride
	var pickupLat, pickupLng, dropoffLat, dropoffLng float64

	err := r.server.DB.Pool.QueryRow(
		ctx, query, userID,
		model.RideStatusRequested,
		model.RideStatusAccepted,
		model.RideStatusDriverArrived,
		model.RideStatusInProgress,
	).Scan(
		&ride.ID, &ride.UserID, &ride.DriverID,
		&pickupLat, &pickupLng, &ride.PickupAddress,
		&dropoffLat, &dropoffLng, &ride.DropoffAddress,
		&ride.Status, &ride.Fare, &ride.DistanceKm, &ride.DurationMinutes,
		&ride.RequestedAt, &ride.AcceptedAt, &ride.StartedAt, &ride.CompletedAt,
		&ride.PaymentStatus, &ride.PaymentID, &ride.Rating, &ride.Feedback,
		&ride.CreatedAt, &ride.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("no active ride found")
	}

	ride.PickupLocation = model.Location{Latitude: pickupLat, Longitude: pickupLng}
	ride.DropoffLocation = model.Location{Latitude: dropoffLat, Longitude: dropoffLng}

	return &ride, nil
}

// GetActiveRideForDriver gets the active ride for a driver
func (r *RideRepository) GetActiveRideForDriver(ctx context.Context, driverID string) (*model.Ride, error) {
	query := `
		SELECT 
			id, user_id, driver_id,
			ST_Y(pickup_location::geometry) as pickup_lat,
			ST_X(pickup_location::geometry) as pickup_lng,
			pickup_address,
			ST_Y(dropoff_location::geometry) as dropoff_lat,
			ST_X(dropoff_location::geometry) as dropoff_lng,
			dropoff_address,
			status, fare, distance_km, duration_minutes,
			requested_at, accepted_at, started_at, completed_at,
			payment_status, payment_id, rating, feedback,
			created_at, updated_at
		FROM rides
		WHERE driver_id = $1 
		  AND status IN ($2, $3, $4)
		ORDER BY accepted_at DESC
		LIMIT 1
	`

	var ride model.Ride
	var pickupLat, pickupLng, dropoffLat, dropoffLng float64

	err := r.server.DB.Pool.QueryRow(
		ctx, query, driverID,
		model.RideStatusAccepted,
		model.RideStatusDriverArrived,
		model.RideStatusInProgress,
	).Scan(
		&ride.ID, &ride.UserID, &ride.DriverID,
		&pickupLat, &pickupLng, &ride.PickupAddress,
		&dropoffLat, &dropoffLng, &ride.DropoffAddress,
		&ride.Status, &ride.Fare, &ride.DistanceKm, &ride.DurationMinutes,
		&ride.RequestedAt, &ride.AcceptedAt, &ride.StartedAt, &ride.CompletedAt,
		&ride.PaymentStatus, &ride.PaymentID, &ride.Rating, &ride.Feedback,
		&ride.CreatedAt, &ride.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("no active ride found")
	}

	ride.PickupLocation = model.Location{Latitude: pickupLat, Longitude: pickupLng}
	ride.DropoffLocation = model.Location{Latitude: dropoffLat, Longitude: dropoffLng}

	return &ride, nil
}
