package service

import (
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/repository"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
)

type Services struct {
	Auth     *AuthService
	Driver   *DriverService
	Location *LocationService
	Ride     *RideService
}

func NewServices(s *server.Server, repos *repository.Repositories) (*Services, error) {
	authService := NewAuthService(s, repos)
	driverService := NewDriverService(s, repos)
	locationService := NewLocationService(s, repos)
	rideService := NewRideService(s, repos, locationService)
	return &Services{
		Auth:     authService,
		Driver:   driverService,
		Location: locationService,
		Ride:     rideService,
	}, nil
}
