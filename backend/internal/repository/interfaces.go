package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model/driver"
)

// RideRepository defines the interface for ride-related data operations
type RiddeRepository interface {
	Create(ctx context.Context, ride *model.Ride) error
	GetByID(ctx context.Context, rideID string) (*model.Ride, error)
	UpdateStatus(ctx context.Context, rideID string, status model.RideStatus) error
	UpdatePaymentStatus(ctx context.Context, rideID string, paymentStatus model.PaymentStatus, paymentID string) error
	AssignDriver(ctx context.Context, rideID, driverID string) error
	GetActiveRideForUser(ctx context.Context, userID string) (*model.Ride, error)
	GetActiveRideForDriver(ctx context.Context, driverID string) (*model.Ride, error)
	FindNearbyRides(ctx context.Context, lat, lng, radiusKm float64) ([]model.Ride, error)
}

// DriverRepository defines the interface for driver-related data operations
type DriverrRepository interface {
	Create(ctx context.Context, d *driver.Driver) error
	GetByUserID(ctx context.Context, userID uuid.UUID) (*driver.Driver, error)
	GetByID(ctx context.Context, id uuid.UUID) (*driver.Driver, error)
	Update(ctx context.Context, d *driver.Driver) error
}
