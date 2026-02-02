package middleware

import (
	"github.com/newrelic/go-agent/v3/newrelic"
	"github.com/satya-18-w/go-boilerplate/internal/server"
)

type Middlewares struct {
	Global          *GlobalMiddlewares
	Auth            *AuthMiddleware
	ContextEnhancer *ContextEnhancer
	Tracing         *TracingMiddleWare
	RateLimit       *RateLimitMiddleware
}

func NewMiddlewares(s *server.Server) *Middlewares{
	// Get New relic Application instance from server
	var nrApp *newrelic.Application
	if s.LoggerService != nil {
		nrApp = s.LoggerService.GetApplication()


	}
	return &Middlewares{
		Global: NewGlobalMiddlewares(s),
		Auth: NewAuthMiddleware(s),
		ContextEnhancer: NewContextEnhancer(s),
		Tracing: NewTracingMiddleware(s,nrApp),
		RateLimit: NewRateLimitMiddleware(s),
	}


}