package repository

import "github.com/satya-18-w/RAPID-RIDE/backend/internal/server"

type Repositories struct {
	User   *UserRepository
	Driver *DriverRepository
	Ride   *RideRepository
}

func NewRepositories(s *server.Server) *Repositories {
	return &Repositories{
		User:   NewUserRepository(s),
		Driver: NewDriverRepository(s),
		Ride:   NewRideRepository(s),
	}
}
