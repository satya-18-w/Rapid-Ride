package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/errs"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model/driver"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/repository"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
)

type DriverService struct {
	server *server.Server
	repo   *repository.Repositories
}

func NewDriverService(s *server.Server, repo *repository.Repositories) *DriverService {
	return &DriverService{
		server: s,
		repo:   repo,
	}
}

func (s *DriverService) CreateProfile(ctx context.Context, userId uuid.UUID, req *driver.CreateDriverRequest) (*driver.Driver, error) {
	user, err := s.repo.User.GetByID(ctx, userId)
	if err != nil {
		return nil, errs.Wrap(err, "user not found")
	}

	if user.Role != model.RoleDriver {
		return nil, errs.NewNotFoundError("user is not a driver", false, nil)
	}
	// 2. Check if profile already exists
	existing, err := s.repo.Driver.GetByUserID(ctx, userId)
	if err != nil {
		return nil, errs.Wrap(err, "failed to check existing profile")
	}
	if existing != nil {
		return nil, errs.NewNotFoundError("driver profile already exists", false, nil)
	}

	driver := &driver.Driver{
		Base: model.Base{
			ID:        uuid.New(),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		UserID:        userId,
		VehicleType:   req.VehicleType,
		VehicleNumber: req.VehicleNumber,
		Capacity:      req.Capacity,
	}

	if err := s.repo.Driver.Create(ctx, driver); err != nil {
		return nil, errs.Wrap(err, "failed to create driver profile")
	}

	return driver, nil

}

// UpdateProfile updates a driver's profile
func (s *DriverService) UpdateProfile(ctx context.Context, userID uuid.UUID, req *driver.CreateDriverRequest) (*driver.Driver, error) {
	// Check if profile exists
	existing, err := s.repo.Driver.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, errs.NewNotFoundError("driver profile not found", false, nil)
	}

	// Update fields
	existing.VehicleType = req.VehicleType
	existing.VehicleNumber = req.VehicleNumber
	existing.Capacity = req.Capacity
	existing.UpdatedAt = time.Now()

	if err := s.repo.Driver.Update(ctx, existing); err != nil {
		return nil, err
	}

	return existing, nil
}

// GetProfile gets a driver's profile
func (s *DriverService) GetProfile(ctx context.Context, userID uuid.UUID) (*driver.Driver, error) {
	driver, err := s.repo.Driver.GetByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if driver == nil {
		return nil, errs.NewNotFoundError("driver profile not found", false, nil)
	}

	return driver, nil
}

