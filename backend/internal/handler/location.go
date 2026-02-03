package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/service"
)

type LocationHandler struct {
	Handler
	locationService *service.LocationService
}

func NewLocationHandler(s *server.Server, locationService *service.LocationService) *LocationHandler {
	return &LocationHandler{
		Handler:         NewHandler(s),
		locationService: locationService,
	}
}

// UpdateLocation handles driver location updates
func (h *LocationHandler) UpdateLocation(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, req *model.LocationUpdate) (*map[string]string, error) {
			// Get driver ID from context (set by auth middleware)
			driverID, ok := c.Get("user_id").(string)
			if !ok {
				return nil, echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
			}

			req.DriverID = driverID

			if err := h.locationService.UpdateDriverLocation(c.Request().Context(), req); err != nil {
				return nil, err
			}

			return &map[string]string{"message": "Location updated successfully"}, nil
		},
		http.StatusOK,
		&model.LocationUpdate{},
	)(c)
}

// FindNearbyDrivers finds drivers near a location
func (h *LocationHandler) FindNearbyDrivers(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, req *model.NearbyDriversRequest) (*map[string]interface{}, error) {
			drivers, err := h.locationService.FindNearbyDrivers(c.Request().Context(), req)
			if err != nil {
				return nil, err
			}

			return &map[string]interface{}{
				"drivers": drivers,
				"count":   len(drivers),
			}, nil
		},
		http.StatusOK,
		&model.NearbyDriversRequest{},
	)(c)
}

// SetAvailability sets driver availability status
func (h *LocationHandler) SetAvailability(c echo.Context) error {
	type AvailabilityRequest struct {
		Available bool `json:"available"`
	}

	var req AvailabilityRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid request body")
	}

	driverID, ok := c.Get("user_id").(string)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	if err := h.locationService.SetDriverAvailability(c.Request().Context(), driverID, req.Available); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":   "Availability updated successfully",
		"available": req.Available,
	})
}
