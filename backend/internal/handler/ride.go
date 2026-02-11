package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/service"
)

type RideHandler struct {
	Handler
	rideService *service.RideService
}

func NewRideHandler(s *server.Server, rideService *service.RideService) *RideHandler {
	return &RideHandler{
		Handler:     NewHandler(s),
		rideService: rideService,
	}
}

// CreateRide creates a new ride request
func (h *RideHandler) CreateRide(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, req *model.RideRequest) (*model.RideResponse, error) {
			userID, ok := c.Get("user_id").(string)
			if !ok {
				return nil, echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
			}

			return h.rideService.CreateRideRequest(c.Request().Context(), userID, *req)
		},
		http.StatusCreated,
		&model.RideRequest{},
	)(c)
}

// AcceptRide allows a driver to accept a ride
func (h *RideHandler) AcceptRide(c echo.Context) error {
	driverID, ok := c.Get("user_id").(string)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	rideID := c.Param("id")
	if rideID == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Ride ID required")
	}

	ride, err := h.rideService.AcceptRide(c.Request().Context(), driverID, rideID)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, ride)
}

// StartRide starts a ride with OTP verification
func (h *RideHandler) StartRide(c echo.Context) error {
	driverID, ok := c.Get("user_id").(string)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	rideID := c.Param("id")
	if rideID == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Ride ID required")
	}

	var req model.RideStartRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	ride, err := h.rideService.StartRideWithOTP(c.Request().Context(), driverID, rideID, req.OTP)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, ride)
}

// CompleteRide completes a ride
func (h *RideHandler) CompleteRide(c echo.Context) error {
	driverID, ok := c.Get("user_id").(string)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	rideID := c.Param("id")
	if rideID == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Ride ID required")
	}

	ride, err := h.rideService.CompleteRide(c.Request().Context(), driverID, rideID)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, ride)
}

// CancelRide cancels a ride
func (h *RideHandler) CancelRide(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	rideID := c.Param("id")
	if rideID == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Ride ID required")
	}

	if err := h.rideService.CancelRide(c.Request().Context(), userID, rideID); err != nil {
		return err
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "Ride cancelled successfully",
	})
}

// GetActiveRide gets the active ride for a user or driver
func (h *RideHandler) GetActiveRide(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	role, _ := c.Get("role").(string)
	isDriver := role == string(model.RoleDriver)

	ride, err := h.rideService.GetActiveRide(c.Request().Context(), userID, isDriver)
	if err != nil {
		return echo.NewHTTPError(http.StatusNotFound, "No active ride found")
	}

	return c.JSON(http.StatusOK, ride)
}

// RateRide rates a completed ride
func (h *RideHandler) RateRide(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, req *model.RideRatingRequest) (*map[string]string, error) {
			userID, ok := c.Get("user_id").(string)
			if !ok {
				return nil, echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
			}

			rideID := c.Param("id")
			if rideID == "" {
				return nil, echo.NewHTTPError(http.StatusBadRequest, "Ride ID required")
			}

			if err := h.rideService.RateRide(c.Request().Context(), userID, rideID, req); err != nil {
				return nil, err
			}

			return &map[string]string{"message": "Ride rated successfully"}, nil
		},
		http.StatusOK,
		&model.RideRatingRequest{},
	)(c)
}

// GetNearbyRides gets nearby available rides for drivers
func (h *RideHandler) GetNearbyRides(c echo.Context) error {
	driverID, ok := c.Get("user_id").(string)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	// Double check role
	role, _ := c.Get("role").(string)
	if role != string(model.RoleDriver) && role != string(model.RoleAdmin) {
		return echo.NewHTTPError(http.StatusForbidden, "Only drivers can see nearby rides")
	}

	lat := 0.0
	lng := 0.0
	radius := 5.0 // km

	type LocationQuery struct {
		Latitude  float64 `query:"latitude"`
		Longitude float64 `query:"longitude"`
		Radius    float64 `query:"radius"`
	}

	var query LocationQuery
	if err := c.Bind(&query); err == nil {
		lat = query.Latitude
		lng = query.Longitude
		if query.Radius > 0 {
			radius = query.Radius
		}
	}

	// If lat/lng are 0, try to get from driver's last location
	if lat == 0 && lng == 0 {
		loc, err := h.rideService.GetDriverLocation(c.Request().Context(), driverID)
		if err == nil && loc != nil {
			lat = loc.Latitude
			lng = loc.Longitude
		} else {
			return echo.NewHTTPError(http.StatusBadRequest, "Location required (latitude/longitude params)")
		}
	}

	rides, err := h.rideService.GetNearbyRides(c.Request().Context(), lat, lng, radius)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, rides)
}
