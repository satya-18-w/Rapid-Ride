package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/repository"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/service"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestCreateRideRequest(t *testing.T) {
	// Setup Miniredis
	mr, err := miniredis.Run()
	assert.NoError(t, err)
	defer mr.Close()

	redisClient := redis.NewClient(&redis.Options{
		Addr: mr.Addr(),
	})

	// Setup Mocks
	mockRideRepo := new(testutil.MockRideRepository)
	mockRepo := &repository.Repositories{
		Ride: mockRideRepo,
	}

	// Setup Server (only need Logger and Redis)
	logger := zerolog.Nop()
	srv := &server.Server{
		Logger: &logger,
		Redis:  redisClient,
	}

	// Setup Service
	// Passing nil for LocationService as it's not used in CreateRideRequest (unless driver is assigned)
	rideService := service.NewRideService(srv, mockRepo, nil)

	t.Run("Success", func(t *testing.T) {
		userID := uuid.New().String()
		req := model.RideRequest{
			PickupLocation:  model.Location{Latitude: 12.9716, Longitude: 77.5946},
			DropoffLocation: model.Location{Latitude: 12.9352, Longitude: 77.6245},
			PickupAddress:   "Pickup Address",
			DropoffAddress:  "Dropoff Address",
			VehicleType:     "auto",
			PaymentMethod:   "cash",
		}

		mockRideRepo.On("Create", mock.Anything, mock.MatchedBy(func(r *model.Ride) bool {
			return r.UserID == userID &&
				r.Status == model.RideStatusRequested &&
				*r.VehicleType == "auto" &&
				*r.PaymentMethod == "cash"
		})).Return(nil)

		resp, err := rideService.CreateRideRequest(context.Background(), userID, req)

		assert.NoError(t, err)
		assert.NotNil(t, resp)
		assert.Equal(t, model.RideStatusRequested, resp.Status)
		assert.Equal(t, "auto", resp.VehicleType)

		// Verify mock expectations
		mockRideRepo.AssertExpectations(t)

		// Allow async goroutines to possibly run (though we don't assert on them strictly here)
		time.Sleep(10 * time.Millisecond)
	})

	t.Run("Database Error", func(t *testing.T) {
		userID := uuid.New().String()
		req := model.RideRequest{
			PickupLocation:  model.Location{Latitude: 12.9716, Longitude: 77.5946},
			DropoffLocation: model.Location{Latitude: 12.9352, Longitude: 77.6245},
			VehicleType:     "car",
			PaymentMethod:   "upi",
		}

		mockRideRepo.ExpectedCalls = nil // Reset expectations
		mockRideRepo.On("Create", mock.Anything, mock.Anything).Return(assert.AnError)

		resp, err := rideService.CreateRideRequest(context.Background(), userID, req)

		assert.Error(t, err)
		assert.Nil(t, resp)
		mockRideRepo.AssertExpectations(t)
	})
}
