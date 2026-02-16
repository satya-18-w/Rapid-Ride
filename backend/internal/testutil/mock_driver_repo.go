package testutil

import (
	"context"

	"github.com/google/uuid"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model/driver"
	"github.com/stretchr/testify/mock"
)

// MockDriverRepository is a mock implementation of the DriverRepository interface
type MockDriverRepository struct {
	mock.Mock
}

func (m *MockDriverRepository) Create(ctx context.Context, d *driver.Driver) error {
	args := m.Called(ctx, d)
	return args.Error(0)
}

func (m *MockDriverRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*driver.Driver, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*driver.Driver), args.Error(1)
}

func (m *MockDriverRepository) GetByID(ctx context.Context, id uuid.UUID) (*driver.Driver, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*driver.Driver), args.Error(1)
}

func (m *MockDriverRepository) Update(ctx context.Context, d *driver.Driver) error {
	args := m.Called(ctx, d)
	return args.Error(0)
}
