package service

import (
	"context"
	"fmt"
	"math"
	"math/rand"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/errs"
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

// // CreateRideRequest creates a new ride request
// func (s *RideService) CreateRideRequest(ctx context.Context, userID string, req *model.RideRequest) (*model.RideResponse, error) {
// 	// Check if user already has an active ride
// 	activeRide, _ := s.repo.Ride.GetActiveRideForUser(ctx, userID)
// 	if activeRide != nil {
// 		return nil, fmt.Errorf("you already have an active ride")
// 	}

// 	// Calculate distance and fare
// 	distance := calculateDistance(req.PickupLocation, req.DropoffLocation)
// 	estimatedTime := int(math.Ceil((distance / averageSpeed) * 60)) // minutes
// 	fare := calculateFare(distance, estimatedTime)

// 	// Create ride
// 	ride := &model.Ride{
// 		UserID:          userID,
// 		PickupLocation:  req.PickupLocation,
// 		PickupAddress:   req.PickupAddress,
// 		DropoffLocation: req.DropoffLocation,
// 		DropoffAddress:  req.DropoffAddress,
// 		Status:          model.RideStatusRequested,
// 		Fare:            &fare,
// 		DistanceKm:      &distance,
// 		DurationMinutes: &estimatedTime,
// 		PaymentStatus:   model.PaymentStatusPending,
// 	}

// 	if err := s.repo.Ride.Create(ctx, ride); err != nil {
// 		s.server.Logger.Error().Err(err).Msg("Failed to create ride")
// 		return nil, fmt.Errorf("failed to create ride: %w", err)
// 	}

// 	s.server.Logger.Info().
// 		Str("ride_id", ride.ID).
// 		Str("user_id", userID).
// 		Float64("fare", fare).
// 		Msg("Ride request created")

// 	// TODO: Notify nearby drivers via WebSocket

// 	return s.buildRideResponse(ctx, ride)
// }

// New Logic
func (r *RideService) CreateRideRequest(ctx context.Context, userID string, req model.RideRequest) (*model.RideResponse, error) {
	dist := calculateDistance(req.PickupLocation, req.DropoffLocation)
	estimatedTime := int(math.Ceil((dist / averageSpeed) * 60))
	fare := calculateFare(dist, estimatedTime)
	ride := &model.Ride{
		UserID:          userID,
		PickupLocation:  req.PickupLocation,
		PickupAddress:   req.PickupAddress,
		DropoffLocation: req.DropoffLocation,
		DropoffAddress:  req.DropoffAddress,
		Status:          model.RideStatusRequested,
		VehicleType:     &req.VehicleType,
		PaymentMethod:   &req.PaymentMethod,
		Fare:            &fare,
		DistanceKm:      &dist,
		DurationMinutes: &estimatedTime,
		PaymentStatus:   model.PaymentStatusPending,
	}

	if err := r.repo.Ride.Create(ctx, ride); err != nil {
		return nil, err
	}

	// Add to Redis Geospatial Index
	go func() {
		// Use a background context or specific timeout context for Redis op
		// to avoid holding up the response significantly, or handle error gracefully
		bgCtx := context.Background()
		cmd := r.server.Redis.GeoAdd(bgCtx, "rides:requested", &redis.GeoLocation{
			Name:      ride.ID,
			Longitude: ride.PickupLocation.Longitude,
			Latitude:  ride.PickupLocation.Latitude,
		})
		if err := cmd.Err(); err != nil {
			r.server.Logger.Error().Err(err).Str("ride_id", ride.ID).Msg("Failed to add ride to Redis GEO index")
		} else {
			// Set expiration for the key if it's new (optional, but good practice to clean up eventually)
			// But since we use ZREM on accept/cancel, explicit expiration might not be needed immediately
			// unless we want to auto-expire old requests.
			// r.server.Redis.Expire(bgCtx, "rides:requested", 24*time.Hour)
		}
	}()

	resp, err := r.buildRideResponse(ctx, ride)
	if err != nil {
		return nil, err
	}

	// Broadcast new ride request to all nearby online drivers
	go func() {
		bgCtx := context.Background()
		// Find drivers within 10km of pickup
		nearbyDrivers, err := r.server.Redis.GeoRadius(bgCtx,
			"drivers:geo",
			ride.PickupLocation.Longitude,
			ride.PickupLocation.Latitude,
			&redis.GeoRadiusQuery{
				Radius:    10,
				Unit:      "km",
				Count:     50,
				Sort:      "ASC",
				WithCoord: true,
				WithDist:  true,
			},
		).Result()
		if err != nil {
			r.server.Logger.Error().Err(err).Msg("Failed to find nearby drivers for broadcast")
			return
		}

		for _, driver := range nearbyDrivers {
			// Check if driver is online
			onlineKey := "driver:online:" + driver.Name
			exists, err := r.server.Redis.Get(bgCtx, onlineKey).Result()
			if err != nil || exists == "" {
				continue
			}

			// driver.Name is the user_id (set by WebSocket handler)
			r.server.Hub.BroadcastToUser(driver.Name, "new_ride_request", resp)
		}
		r.server.Logger.Info().
			Int("nearby_drivers", len(nearbyDrivers)).
			Str("ride_id", ride.ID).
			Msg("Broadcasted ride request to nearby drivers")
	}()

	return resp, nil

}

// AcceptRide allows a driver to accept a ride request
// func (s *RideService) AcceptRide(ctx context.Context, driverID, rideID string) (*model.RideResponse, error) {
// 	// Check if driver has an active ride
// 	activeRide, _ := s.repo.Ride.GetActiveRideForDriver(ctx, driverID)
// 	if activeRide != nil {
// 		return nil, fmt.Errorf("you already have an active ride")
// 	}

// 	// Assign driver to ride
// 	if err := s.repo.Ride.AssignDriver(ctx, rideID, driverID); err != nil {
// 		s.server.Logger.Error().Err(err).Str("ride_id", rideID).Msg("Failed to assign driver")
// 		return nil, fmt.Errorf("failed to accept ride: %w", err)
// 	}

// 	// Get updated ride
// 	ride, err := s.repo.Ride.GetByID(ctx, rideID)
// 	if err != nil {
// 		return nil, err
// 	}

// 	s.server.Logger.Info().
// 		Str("ride_id", rideID).
// 		Str("driver_id", driverID).
// 		Msg("Ride accepted by driver")

// 	// TODO: Notify user via WebSocket

// 	return s.buildRideResponse(ctx, ride)
// }

// New logic

func (r *RideService) AcceptRide(ctx context.Context, driverId, rideID string) (*model.RideResponse, error) {
	// driverId is actually the UserID from the context
	driverUserUUID, err := uuid.Parse(driverId)
	if err != nil {
		return nil, errs.NewBadRequest("invalid driver user id")
	}

	driverProfile, err := r.repo.Driver.GetByUserID(ctx, driverUserUUID)
	if err != nil {
		return nil, errs.Wrap(err, "failed to get driver profile")
	}
	if driverProfile == nil {
		return nil, errs.NewBadRequest("driver profile not found service")
	}

	// Use the actual Driver ID (PK of drivers table)
	actualDriverID := driverProfile.ID.String()

	tx, err := r.server.DB.Pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, errs.Wrap(err, "failed to begin transaction")
	}

	// Lock ride
	defer tx.Rollback(ctx)

	var status string
	err = tx.QueryRow(ctx, `SELECT status FROM rides WHERE id = @ride_id FOR UPDATE`, pgx.NamedArgs{
		"ride_id": rideID,
	}).Scan(&status)

	if err != nil {
		return nil, errs.Wrap(err, "failed to query row")
	}

	if status != string(model.RideStatusRequested) {
		return nil, errs.NewBadRequest("ride cannot be accepted in current status ride is already accepted")
	}

	// Ensure Driver not already in active ride
	var count int
	err = tx.QueryRow(ctx, `
	SELECT COUNT(1) 
	FROM rides
	WHERE driver_id = @driver_id AND 
	status IN ('accepted','driver_arrived','in_progress')`, pgx.NamedArgs{
		"driver_id": actualDriverID,
	}).Scan(&count)

	if err != nil {
		return nil, errs.Wrap(err, "failed to query row")
	}

	if count > 0 {
		return nil, errs.NewBadRequest("driver already has an active ride")
	}

	// Generate 4-digit OTP for ride verification
	otp := fmt.Sprintf("%04d", rand.Intn(9000)+1000)

	// Update ride status with OTP
	_, err = tx.Exec(ctx, `
	UPDATE rides
	SET driver_id = @driver_id,
	status = @status,
	otp = @otp,
	accepted_at = NOW(),
	updated_at = NOW()
	WHERE id = @ride_id`,
		pgx.NamedArgs{
			"ride_id":   rideID,
			"driver_id": actualDriverID,
			"status":    string(model.RideStatusAccepted),
			"otp":       otp,
		})

	if err != nil {
		return nil, errs.Wrap(err, "failed to update ride")
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, errs.Wrap(err, "failed to commit transaction")
	}

	rideResult, err := r.repo.Ride.GetByID(ctx, rideID)
	if err != nil {
		return nil, errs.Wrap(err, "failed to get ride")
	}

	// Remove from Redis Geospatial Index
	go func() {
		if err := r.server.Redis.ZRem(context.Background(), "rides:requested", rideID).Err(); err != nil {
			r.server.Logger.Error().Err(err).Str("ride_id", rideID).Msg("Failed to remove ride from Redis GEO index")
		}
	}()

	// Broadcast to Rider
	resp, _ := r.buildRideResponse(ctx, rideResult)
	r.server.Hub.BroadcastToUser(rideResult.UserID, "ride_accepted", resp)

	return resp, nil

}

// StartRideWithOTP starts a ride with OTP verification
func (r *RideService) StartRideWithOTP(ctx context.Context, driverID, rideID, otp string) (*model.RideResponse, error) {
	// Get ride to verify OTP
	ride, err := r.repo.Ride.GetByID(ctx, rideID)
	if err != nil {
		return nil, errs.Wrap(err, "failed to get ride")
	}

	// Verify driver assignment
	if ride.DriverID == nil || *ride.DriverID != driverID {
		return nil, errs.NewBadRequest("unauthorized - ride not assigned to this driver")
	}

	// Verify OTP
	if ride.OTP == nil || *ride.OTP != otp {
		return nil, errs.NewBadRequest("invalid OTP")
	}

	// Verify ride status
	if ride.Status != model.RideStatusAccepted && ride.Status != model.RideStatusDriverArrived {
		return nil, errs.NewBadRequest("ride cannot be started in current status")
	}

	// Start the ride
	return r.StartRide(ctx, driverID, rideID)
}

// StartRide marks a ride as in progress
// func (s *RideService) StartRide(ctx context.Context, driverID, rideID string) (*model.RideResponse, error) {
// 	ride, err := s.repo.Ride.GetByID(ctx, rideID)
// 	if err != nil {
// 		return nil, err
// 	}

// 	if ride.DriverID == nil || *ride.DriverID != driverID {
// 		return nil, fmt.Errorf("unauthorized")
// 	}

// 	if ride.Status != model.RideStatusAccepted && ride.Status != model.RideStatusDriverArrived {
// 		return nil, fmt.Errorf("ride cannot be started in current status")
// 	}

// 	// Update ride status
// 	query := `
// 		UPDATE rides
// 		SET status = $1, started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
// 		WHERE id = $2
// 	`
// 	if _, err := s.server.DB.Pool.Exec(ctx, query, model.RideStatusInProgress, rideID); err != nil {
// 		return nil, fmt.Errorf("failed to start ride: %w", err)
// 	}

// 	s.server.Logger.Info().Str("ride_id", rideID).Msg("Ride started")

// 	// Get updated ride
// 	ride, err = s.repo.Ride.GetByID(ctx, rideID)
// 	if err != nil {
// 		return nil, err
// 	}

// 	return s.buildRideResponse(ctx, ride)
// }

// New Logic

func (r *RideService) StartRide(ctx context.Context, driverId, rideID string) (*model.RideResponse, error) {
	result, err := r.server.DB.Pool.Exec(ctx, `
	UPDATE rides
	SET status = @status,
	started_at = NOW(),
	updated_at = NOW()
	WHERE id = @ride_id
	AND driver_id = @driver_id
	AND status IN ('accepted' , 'driver_arrived')`,
		pgx.NamedArgs{
			"ride_id":   rideID,
			"driver_id": driverId,
			"status":    model.RideStatusInProgress,
		})

	if err != nil {
		return nil, errs.Wrap(err, "failed to start ride")
	}

	if result.RowsAffected() == 0 {
		return nil, errs.NewBadRequest("Cannot start ride")
	}

	rideResult, err := r.repo.Ride.GetByID(ctx, rideID)
	if err != nil {
		return nil, errs.Wrap(err, "failed to get ride")
	}

	// Broadcast to Rider
	resp, _ := r.buildRideResponse(ctx, rideResult)
	r.server.Hub.BroadcastToUser(rideResult.UserID, "ride_started", resp)

	return resp, nil
}

// CompleteRide marks a ride as completed
// func (s *RideService) CompleteRide(ctx context.Context, driverID, rideID string) (*model.RideResponse, error) {
// 	ride, err := s.repo.Ride.GetByID(ctx, rideID)
// 	if err != nil {
// 		return nil, err
// 	}

// 	if ride.DriverID == nil || *ride.DriverID != driverID {
// 		return nil, fmt.Errorf("unauthorized")
// 	}

// 	if ride.Status != model.RideStatusInProgress {
// 		return nil, fmt.Errorf("ride is not in progress")
// 	}

// 	// Update ride status
// 	query := `
// 		UPDATE rides
// 		SET status = $1, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
// 		WHERE id = $2
// 	`
// 	if _, err := s.server.DB.Pool.Exec(ctx, query, model.RideStatusCompleted, rideID); err != nil {
// 		return nil, fmt.Errorf("failed to complete ride: %w", err)
// 	}

// 	s.server.Logger.Info().Str("ride_id", rideID).Msg("Ride completed")

// 	// Get updated ride
// 	ride, err = s.repo.Ride.GetByID(ctx, rideID)
// 	if err != nil {
// 		return nil, err
// 	}

// 	// TODO: Create payment order

// 	return s.buildRideResponse(ctx, ride)
// }

func (r *RideService) CompleteRide(ctx context.Context, driverID, rideID string) (*model.RideResponse, error) {
	result, err := r.server.DB.Pool.Exec(ctx, `
	UPDATE rides
	SET status = @status,
	completed_at =  NOW(),
	updated_at = NOW()
	WHERE id = @ride_id 
	AND driver_id = @driver_id
	AND status = @in_progress`,
		pgx.NamedArgs{
			"ride_id":     rideID,
			"driver_id":   driverID,
			"status":      model.RideStatusCompleted,
			"in_progress": model.RideStatusInProgress,
		})

	if err != nil {
		return nil, errs.Wrap(err, "failed to complete ride")
	}
	if result.RowsAffected() == 0 {
		return nil, errs.NewBadRequest("cannot complete ride")
	}

	rideResult, err := r.repo.Ride.GetByID(ctx, rideID)
	if err != nil {
		return nil, errs.Wrap(err, "failed to get ride")
	}

	// Broadcast to Rider
	resp, _ := r.buildRideResponse(ctx, rideResult)
	r.server.Hub.BroadcastToUser(rideResult.UserID, "ride_completed", resp)

	return resp, nil
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

	// Remove from Redis Geospatial Index
	go func() {
		if err := s.server.Redis.ZRem(context.Background(), "rides:requested", rideID).Err(); err != nil {
			s.server.Logger.Error().Err(err).Str("ride_id", rideID).Msg("Failed to remove ride from Redis GEO index")
		}
	}()

	// Notify driver if assigned
	if ride.DriverID != nil {
		driverUUID, err := uuid.Parse(*ride.DriverID)
		if err == nil {
			d, err := s.repo.Driver.GetByID(context.Background(), driverUUID)
			if err == nil && d != nil {
				// Broadcast to Driver
				s.server.Hub.BroadcastToUser(d.UserID.String(), "ride_cancelled", ride)
			}
		}
	}

	// Also broadcast update to Rider (themselves) to confirm cancellation state?
	// s.server.Hub.BroadcastToUser(userID, "ride_cancelled", ride)

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
		AND status = $4
	`
	if _, err := s.server.DB.Pool.Exec(ctx, query, req.Rating, req.Feedback, rideID, model.RideStatusCompleted); err != nil {
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

	if ride.VehicleType != nil {
		response.VehicleType = *ride.VehicleType
	}
	if ride.PaymentMethod != nil {
		response.PaymentMethod = *ride.PaymentMethod
	}
	if ride.OTP != nil {
		response.OTP = *ride.OTP
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
					location, _ := s.locationService.GetDriverlocation(ctx, *ride.DriverID)
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

// GetNearbyRides finds active ride requests near a location
func (s *RideService) GetNearbyRides(ctx context.Context, lat, lng, radiusKm float64) ([]*model.RideResponse, error) {
	rides, err := s.repo.Ride.FindNearbyRides(ctx, lat, lng, radiusKm)
	if err != nil {
		return nil, err
	}

	var responses []*model.RideResponse
	for _, ride := range rides {
		// Create a local copy to avoid closure issues if any (though not applicable here)
		r := ride
		resp, err := s.buildRideResponse(ctx, &r)
		if err != nil {
			// Log error but continue
			s.server.Logger.Error().Err(err).Str("ride_id", ride.ID).Msg("Failed to build response for ride")
			continue
		}
		responses = append(responses, resp)
	}

	return responses, nil
}

func (s *RideService) GetDriverLocation(ctx context.Context, driverID string) (*model.Location, error) {
	return s.locationService.GetDriverlocation(ctx, driverID)
}
