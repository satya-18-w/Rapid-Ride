package testutil

import (
	"context"

	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
	"github.com/stretchr/testify/mock"
)

// MockRideRepository is a mock implementation of the RideRepository interface
type MockRideRepository struct {
	mock.Mock
}

func (m *MockRideRepository) Create(ctx context.Context, ride *model.Ride) error {
	args := m.Called(ctx, ride)
	return args.Error(0)
}

func (m *MockRideRepository) GetByID(ctx context.Context, rideID string) (*model.Ride, error) {
	args := m.Called(ctx, rideID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Ride), args.Error(1)
}

func (m *MockRideRepository) UpdateStatus(ctx context.Context, rideID string, status model.RideStatus) error {
	args := m.Called(ctx, rideID, status)
	return args.Error(0)
}

func (m *MockRideRepository) UpdatePaymentStatus(ctx context.Context, rideID string, paymentStatus model.PaymentStatus, paymentID string) error {
	args := m.Called(ctx, rideID, paymentStatus, paymentID)
	return args.Error(0)
}

func (m *MockRideRepository) AssignDriver(ctx context.Context, rideID, driverID string) error {
	args := m.Called(ctx, rideID, driverID)
	return args.Error(0)
}

func (m *MockRideRepository) GetActiveRideForUser(ctx context.Context, userID string) (*model.Ride, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Ride), args.Error(1)
}

func (m *MockRideRepository) GetActiveRideForDriver(ctx context.Context, driverID string) (*model.Ride, error) {
	args := m.Called(ctx, driverID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*model.Ride), args.Error(1)
}

func (m *MockRideRepository) FindNearbyRides(ctx context.Context, lat, lng, radiusKm float64) ([]model.Ride, error) {
	args := m.Called(ctx, lat, lng, radiusKm)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]model.Ride), args.Error(1)
}
