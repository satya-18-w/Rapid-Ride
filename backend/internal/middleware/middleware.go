package middleware

import (
	"github.com/newrelic/go-agent/v3/newrelic"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/service"
)

type Middlewares struct {
	Global          *GlobalMiddlewares
	Auth            *AuthMiddleware
	ContextEnhancer *ContextEnhancer
	Tracing         *TracingMiddleWare
	RateLimit       *RateLimitMiddleware
}

func NewMiddlewares(s *server.Server, services *service.Services) *Middlewares {
	// Get New relic Application instance from server
	var nrApp *newrelic.Application
	if s.LoggerService != nil {
		nrApp = s.LoggerService.GetApplication()
	}
	return &Middlewares{
		Global:          NewGlobalMiddlewares(s),
		Auth:            NewAuthMiddleware(s, services.Auth),
		ContextEnhancer: NewContextEnhancer(s),
		Tracing:         NewTracingMiddleware(s, nrApp),
		RateLimit:       NewRateLimitMiddleware(s),
	}
}
