package handler

import (
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/service"
)

type Handlers struct {
	Health   *HealthHandler
	OpenAPI  *OpenAPIHandler
	Auth     *AuthHandler
	Driver   *DriverHandler
	Location *LocationHandler
	Ride     *RideHandler
	Payment  *PaymentHandler
	Map      *MapHandler
}

func NewHandlers(s *server.Server, services *service.Services) *Handlers {
	return &Handlers{
		Health:   NewHealthHandler(s),
		OpenAPI:  NewOpenAPIHandler(s),
		Auth:     NewAuthHandler(s, services.Auth),
		Driver:   NewDriverHandler(s, services.Driver),
		Location: NewLocationHandler(s, services.Location),
		Ride:     NewRideHandler(s, services.Ride),
		Payment:  NewPaymentHandler(services.Payment),
		Map:      NewMapHandler(s),
	}
}
