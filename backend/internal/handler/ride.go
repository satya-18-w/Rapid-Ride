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

			return h.rideService.CreateRideRequest(c.Request().Context(), userID, req)
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

// StartRide starts a ride
func (h *RideHandler) StartRide(c echo.Context) error {
	driverID, ok := c.Get("user_id").(string)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	rideID := c.Param("id")
	if rideID == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Ride ID required")
	}

	ride, err := h.rideService.StartRide(c.Request().Context(), driverID, rideID)
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
