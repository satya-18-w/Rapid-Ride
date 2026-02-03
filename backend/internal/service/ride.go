package service

import (
	"context"
	"fmt"
	"math"

	"github.com/google/uuid"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/repository"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
)

const (
	// Base fare in INR
	baseFare = 30.0
	// Per km rate in INR
	perKmRate = 12.0
	// Per minute rate in INR
	perMinuteRate = 2.0
	// Average speed in km/h for time estimation
	averageSpeed = 30.0
)

type RideService struct {
	server          *server.Server
	repo            *repository.Repositories
	locationService *LocationService
}

func NewRideService(s *server.Server, repo *repository.Repositories, locationService *LocationService) *RideService {
	return &RideService{
		server:          s,
		repo:            repo,
		locationService: locationService,
	}
}

// CreateRideRequest creates a new ride request
func (s *RideService) CreateRideRequest(ctx context.Context, userID string, req *model.RideRequest) (*model.RideResponse, error) {
	// Check if user already has an active ride
	activeRide, _ := s.repo.Ride.GetActiveRideForUser(ctx, userID)
	if activeRide != nil {
		return nil, fmt.Errorf("you already have an active ride")
	}

	// Calculate distance and fare
	distance := calculateDistance(req.PickupLocation, req.DropoffLocation)
	estimatedTime := int(math.Ceil((distance / averageSpeed) * 60)) // minutes
	fare := calculateFare(distance, estimatedTime)

	// Create ride
	ride := &model.Ride{
		UserID:          userID,
		PickupLocation:  req.PickupLocation,
		PickupAddress:   req.PickupAddress,
		DropoffLocation: req.DropoffLocation,
		DropoffAddress:  req.DropoffAddress,
		Status:          model.RideStatusRequested,
		Fare:            &fare,
		DistanceKm:      &distance,
		DurationMinutes: &estimatedTime,
		PaymentStatus:   model.PaymentStatusPending,
	}

	if err := s.repo.Ride.Create(ctx, ride); err != nil {
		s.server.Logger.Error().Err(err).Msg("Failed to create ride")
		return nil, fmt.Errorf("failed to create ride: %w", err)
	}

	s.server.Logger.Info().
		Str("ride_id", ride.ID).
		Str("user_id", userID).
		Float64("fare", fare).
		Msg("Ride request created")

	// TODO: Notify nearby drivers via WebSocket

	return s.buildRideResponse(ctx, ride)
}

// AcceptRide allows a driver to accept a ride request
func (s *RideService) AcceptRide(ctx context.Context, driverID, rideID string) (*model.RideResponse, error) {
	// Check if driver has an active ride
	activeRide, _ := s.repo.Ride.GetActiveRideForDriver(ctx, driverID)
	if activeRide != nil {
		return nil, fmt.Errorf("you already have an active ride")
	}

	// Assign driver to ride
	if err := s.repo.Ride.AssignDriver(ctx, rideID, driverID); err != nil {
		s.server.Logger.Error().Err(err).Str("ride_id", rideID).Msg("Failed to assign driver")
		return nil, fmt.Errorf("failed to accept ride: %w", err)
	}

	// Get updated ride
	ride, err := s.repo.Ride.GetByID(ctx, rideID)
	if err != nil {
		return nil, err
	}

	s.server.Logger.Info().
		Str("ride_id", rideID).
		Str("driver_id", driverID).
		Msg("Ride accepted by driver")

	// TODO: Notify user via WebSocket

	return s.buildRideResponse(ctx, ride)
}

// StartRide marks a ride as in progress
func (s *RideService) StartRide(ctx context.Context, driverID, rideID string) (*model.RideResponse, error) {
	ride, err := s.repo.Ride.GetByID(ctx, rideID)
	if err != nil {
		return nil, err
	}

	if ride.DriverID == nil || *ride.DriverID != driverID {
		return nil, fmt.Errorf("unauthorized")
	}

	if ride.Status != model.RideStatusAccepted && ride.Status != model.RideStatusDriverArrived {
		return nil, fmt.Errorf("ride cannot be started in current status")
	}

	// Update ride status
	query := `
		UPDATE rides 
		SET status = $1, started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`
	if _, err := s.server.DB.Pool.Exec(ctx, query, model.RideStatusInProgress, rideID); err != nil {
		return nil, fmt.Errorf("failed to start ride: %w", err)
	}

	s.server.Logger.Info().Str("ride_id", rideID).Msg("Ride started")

	// Get updated ride
	ride, err = s.repo.Ride.GetByID(ctx, rideID)
	if err != nil {
		return nil, err
	}

	return s.buildRideResponse(ctx, ride)
}

// CompleteRide marks a ride as completed
func (s *RideService) CompleteRide(ctx context.Context, driverID, rideID string) (*model.RideResponse, error) {
	ride, err := s.repo.Ride.GetByID(ctx, rideID)
	if err != nil {
		return nil, err
	}

	if ride.DriverID == nil || *ride.DriverID != driverID {
		return nil, fmt.Errorf("unauthorized")
	}

	if ride.Status != model.RideStatusInProgress {
		return nil, fmt.Errorf("ride is not in progress")
	}

	// Update ride status
	query := `
		UPDATE rides 
		SET status = $1, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`
	if _, err := s.server.DB.Pool.Exec(ctx, query, model.RideStatusCompleted, rideID); err != nil {
		return nil, fmt.Errorf("failed to complete ride: %w", err)
	}

	s.server.Logger.Info().Str("ride_id", rideID).Msg("Ride completed")

	// Get updated ride
	ride, err = s.repo.Ride.GetByID(ctx, rideID)
	if err != nil {
		return nil, err
	}

	// TODO: Create payment order

	return s.buildRideResponse(ctx, ride)
}

// CancelRide cancels a ride
func (s *RideService) CancelRide(ctx context.Context, userID, rideID string) error {
	ride, err := s.repo.Ride.GetByID(ctx, rideID)
	if err != nil {
		return err
	}

	if ride.UserID != userID {
		return fmt.Errorf("unauthorized")
	}

	if ride.Status == model.RideStatusCompleted || ride.Status == model.RideStatusCancelled {
		return fmt.Errorf("ride cannot be cancelled")
	}

	if err := s.repo.Ride.UpdateStatus(ctx, rideID, model.RideStatusCancelled); err != nil {
		return fmt.Errorf("failed to cancel ride: %w", err)
	}

	s.server.Logger.Info().Str("ride_id", rideID).Msg("Ride cancelled")

	// TODO: Notify driver if assigned

	return nil
}

// GetActiveRide gets the active ride for a user or driver
func (s *RideService) GetActiveRide(ctx context.Context, userID string, isDriver bool) (*model.RideResponse, error) {
	var ride *model.Ride
	var err error

	if isDriver {
		ride, err = s.repo.Ride.GetActiveRideForDriver(ctx, userID)
	} else {
		ride, err = s.repo.Ride.GetActiveRideForUser(ctx, userID)
	}

	if err != nil {
		return nil, fmt.Errorf("no active ride found")
	}

	return s.buildRideResponse(ctx, ride)
}

// RateRide allows a user to rate a completed ride
func (s *RideService) RateRide(ctx context.Context, userID, rideID string, req *model.RideRatingRequest) error {
	ride, err := s.repo.Ride.GetByID(ctx, rideID)
	if err != nil {
		return err
	}

	if ride.UserID != userID {
		return fmt.Errorf("unauthorized")
	}

	if ride.Status != model.RideStatusCompleted {
		return fmt.Errorf("can only rate completed rides")
	}

	query := `
		UPDATE rides 
		SET rating = $1, feedback = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`
	if _, err := s.server.DB.Pool.Exec(ctx, query, req.Rating, req.Feedback, rideID); err != nil {
		return fmt.Errorf("failed to rate ride: %w", err)
	}

	// Update driver's average rating
	if ride.DriverID != nil {
		go s.updateDriverRating(context.Background(), *ride.DriverID)
	}

	s.server.Logger.Info().
		Str("ride_id", rideID).
		Int("rating", req.Rating).
		Msg("Ride rated")

	return nil
}

// buildRideResponse builds a complete ride response with driver info
func (s *RideService) buildRideResponse(ctx context.Context, ride *model.Ride) (*model.RideResponse, error) {
	response := &model.RideResponse{
		ID:              ride.ID,
		Status:          ride.Status,
		PickupAddress:   ride.PickupAddress,
		DropoffAddress:  ride.DropoffAddress,
		PickupLocation:  ride.PickupLocation,
		DropoffLocation: ride.DropoffLocation,
		Fare:            ride.Fare,
		DistanceKm:      ride.DistanceKm,
		DurationMinutes: ride.DurationMinutes,
		RequestedAt:     ride.RequestedAt,
		AcceptedAt:      ride.AcceptedAt,
		StartedAt:       ride.StartedAt,
		CompletedAt:     ride.CompletedAt,
		PaymentStatus:   ride.PaymentStatus,
		Rating:          ride.Rating,
		Feedback:        ride.Feedback,
	}

	// Add driver info if assigned
	if ride.DriverID != nil {
		// Parse driver ID to UUID
		driverUUID, err := uuid.Parse(*ride.DriverID)
		if err == nil {
			driver, err := s.repo.Driver.GetByUserID(ctx, driverUUID)
			if err == nil {
				user, err := s.repo.User.GetByID(ctx, driverUUID)
				if err == nil {
					location, _ := s.locationService.GetDriverLocation(ctx, *ride.DriverID)
					if location == nil {
						location = &model.Location{Latitude: 0, Longitude: 0}
					}

					phoneStr := ""
					if user.Phone != nil {
						phoneStr = *user.Phone
					}

					response.Driver = &model.DriverInfo{
						ID:            driver.ID.String(),
						Name:          user.Name,
						Phone:         phoneStr,
						VehicleType:   driver.VehicleType,
						VehicleNumber: driver.VehicleNumber,
						Rating:        driver.Rating,
						Location:      *location,
					}
				}
			}
		}
	}

	return response, nil
}

// updateDriverRating updates a driver's average rating
func (s *RideService) updateDriverRating(ctx context.Context, driverID string) {
	query := `
		UPDATE drivers
		SET rating = (
			SELECT COALESCE(AVG(rating), 5.0)
			FROM rides
			WHERE driver_id = $1 AND rating IS NOT NULL
		)
		WHERE user_id = $1
	`
	if _, err := s.server.DB.Pool.Exec(ctx, query, driverID); err != nil {
		s.server.Logger.Error().Err(err).Str("driver_id", driverID).Msg("Failed to update driver rating")
	}
}

// calculateDistance calculates the distance between two locations using Haversine formula
func calculateDistance(from, to model.Location) float64 {
	const earthRadius = 6371.0 // km

	lat1 := from.Latitude * math.Pi / 180
	lat2 := to.Latitude * math.Pi / 180
	deltaLat := (to.Latitude - from.Latitude) * math.Pi / 180
	deltaLng := (to.Longitude - from.Longitude) * math.Pi / 180

	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(lat1)*math.Cos(lat2)*
			math.Sin(deltaLng/2)*math.Sin(deltaLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadius * c
}

// calculateFare calculates the fare for a ride
func calculateFare(distanceKm float64, durationMinutes int) float64 {
	fare := baseFare + (distanceKm * perKmRate) + (float64(durationMinutes) * perMinuteRate)
	return math.Round(fare*100) / 100 // Round to 2 decimal places
}
