package middleware

import (
	
	"github.com/newrelic/go-agent/v3/integrations/nrpkgerrors"
	"github.com/labstack/echo/v4"
	"github.com/newrelic/go-agent/v3/integrations/nrecho-v4"
	"github.com/newrelic/go-agent/v3/newrelic"
	"github.com/satya-18-w/go-boilerplate/internal/server"
)

type TracingMiddleWare struct {
	server *server.Server
	nrApp  *newrelic.Application
}

func NewTracingMiddleware(s *server.Server, nrApp *newrelic.Application) *TracingMiddleWare {
	return &TracingMiddleWare{
		server: s,
		nrApp:  nrApp,
	}
}

// NewRelicMiddleWare returns the new relic middleware for echo
func (tm *TracingMiddleWare) NewRelicMiddleWare() echo.MiddlewareFunc {
	if tm.nrApp == nil {
		// return a no-op middlware if new relic is not initialized
		return func(next echo.HandlerFunc) echo.HandlerFunc {
			return func(c echo.Context) error {
				return next(c)
			}
		}
	}
	return nrecho.Middleware(tm.nrApp)
}


func (tm *TracingMiddleWare) EnhanceTracing() echo.MiddlewareFunc{
	return func(next echo.HandlerFunc) echo.HandlerFunc{
		return func(c echo.Context) error{
			// Get New Relic transaction from context
			txn:= newrelic.FromContext(c.Request().Context())
			if txn == nil{
				return next(c)
			}
			// service.name and service.environment are already set in logger and New Relic config
			txn.AddAttribute("http.real_ip",c.RealIP())
			txn.AddAttribute("http_user_agent",c.Request().UserAgent())


			if requestID := GetRequestID(c); requestID != "" {
				txn.AddAttribute("request.id", requestID)
			}

			// Add user context if available
			if userID := c.Get("user_id"); userID != nil {
				if userIDStr, ok := userID.(string); ok {
					txn.AddAttribute("user.id", userIDStr)
				}
			}
			// Execute next handler
			err := next(c)
			// Record error if any with enhanced stack traces
			if err != nil {
				txn.NoticeError(nrpkgerrors.Wrap(err))
			}

			// Add response status
			txn.AddAttribute("http.status_code", c.Response().Status)

			return err
		}
	}
}