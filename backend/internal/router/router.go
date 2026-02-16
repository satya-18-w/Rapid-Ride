package router

import (
	"net/http"

	"github.com/labstack/echo/v4"
	echoMiddleware "github.com/labstack/echo/v4/middleware"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/handler"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/middleware"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/realtime"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/service"
	"golang.org/x/time/rate"
)

func NewRouter(s *server.Server, h *handler.Handlers, services *service.Services) *echo.Echo {
	middlewares := middleware.NewMiddlewares(s, services)

	router := echo.New()
	router.HTTPErrorHandler = middlewares.Global.GlobalErrorHandler

	router.Use(
		echoMiddleware.RateLimiterWithConfig(echoMiddleware.RateLimiterConfig{
			Store: echoMiddleware.NewRateLimiterMemoryStore(rate.Limit(20)),
			DenyHandler: func(c echo.Context, identifier string, err error) error {

				if rateLimitMiddleware := middlewares.RateLimit; rateLimitMiddleware != nil {
					rateLimitMiddleware.RecordRateLimitHit(c.Path())
				}

				s.Logger.Warn().Str("request_Id", middleware.GetRequestID(c)).
					Str("Identifier", identifier).
					Str("path", c.Path()).
					Str("method", c.Request().Method).
					Str("ip", c.RealIP()).
					Msg("rate limit exceeded")

				return echo.NewHTTPError(http.StatusTooManyRequests, "Rate limit exceeded")

			},
		}),
		middlewares.Global.CORS(),
		middlewares.Global.Secure(),
		middleware.RequestID(),
		middlewares.Tracing.NewRelicMiddleWare(),
		middlewares.Tracing.EnhanceTracing(),
		middlewares.ContextEnhancer.EnhanceContext(),
		middlewares.Global.RequestLogger(),
		middlewares.Global.Recover(),
	)

	registerSystemRouter(router, h)

	v1 := router.Group("/api/v1")

	auth := v1.Group("/auth")
	{
		auth.POST("/signup", h.Auth.Signup)
		auth.POST("/login", h.Auth.Login)
		auth.POST("/otp/send", h.Auth.SendOTP)
		auth.POST("/otp/verify", h.Auth.VerifyOTP)
		auth.GET("/me", h.Auth.Me, middlewares.Auth.RequireAuth)
		auth.GET("/ws", realtime.Handler(s.Hub), middlewares.Auth.RequireAuth)
	}

	riders := v1.Group("/riders", middlewares.Auth.RequireAuth, middlewares.Auth.RequireRole(model.RoleRider, model.RoleAdmin))
	{

		riders.POST("/logout", h.Auth.SignOut)
	}

	drivers := v1.Group("/drivers", middlewares.Auth.RequireAuth, middlewares.Auth.RequireRole(model.RoleDriver, model.RoleAdmin))
	{

		drivers.POST("/profile", h.Driver.SetupProfile)
		drivers.PUT("/profile", h.Driver.UpdateProfile)
		drivers.GET("/profile", h.Driver.GetProfile)
		drivers.GET("/rides/nearby", h.Ride.GetNearbyRides)
		drivers.POST("/logout", h.Auth.SignOut)
	}

	admin := v1.Group("/admin", middlewares.Auth.RequireAuth, middlewares.Auth.RequireRole(model.RoleAdmin))
	{

		admin.POST("/logout", h.Auth.SignOut)
	}

	// Location routes (drivers only)
	location := v1.Group("/location", middlewares.Auth.RequireAuth, middlewares.Auth.RequireRole(model.RoleDriver))
	{
		location.POST("/update", h.Location.UpdateLocation)
		location.POST("/availability", h.Location.SetAvailability)
	}

	// Public location search (for users to find nearby drivers)
	v1.POST("/location/nearby-drivers", h.Location.FindNearbyDrivers, middlewares.Auth.RequireAuth)

	// Map proxy routes
	maps := v1.Group("/maps", middlewares.Auth.RequireAuth)
	{
		maps.GET("/search", h.Map.SearchLocation)
		maps.GET("/reverse", h.Map.ReverseGeocode)
		maps.GET("/route", h.Map.GetRoute)
	}

	// Ride routes
	rides := v1.Group("/rides", middlewares.Auth.RequireAuth)
	{
		rides.POST("", h.Ride.CreateRide, middlewares.Auth.RequireRole(model.RoleRider))
		rides.GET("/active", h.Ride.GetActiveRide)
		rides.POST("/:id/accept", h.Ride.AcceptRide, middlewares.Auth.RequireRole(model.RoleDriver))
		rides.POST("/:id/start", h.Ride.StartRide, middlewares.Auth.RequireRole(model.RoleDriver))
		rides.POST("/:id/complete", h.Ride.CompleteRide, middlewares.Auth.RequireRole(model.RoleDriver))
		rides.POST("/:id/cancel", h.Ride.CancelRide)
		rides.POST("/:id/rate", h.Ride.RateRide, middlewares.Auth.RequireRole(model.RoleRider))
	}

	// Payment routes

	payments := v1.Group("/payments", middlewares.Auth.RequireAuth)
	{
		payments.POST("/create", h.Payment.CreatePaymentOrder, middlewares.Auth.RequireRole(model.RoleRider))
		payments.POST("/verify", h.Payment.VerifyPayment, middlewares.Auth.RequireRole(model.RoleRider))
		payments.POST("/cash", h.Payment.ProcessCashPayment, middlewares.Auth.RequireRole(model.RoleRider))
		payments.POST("/upi", h.Payment.ProcessUPIPayment, middlewares.Auth.RequireRole(model.RoleRider))
		payments.GET("/ride/:ride_id", h.Payment.GetPaymentByRideID)
	}

	return router
}
