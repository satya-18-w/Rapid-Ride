package handler

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model/driver"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/service"
)

type DriverHandler struct {
	Handler
	driverService *service.DriverService
}

func NewDriverHandler(s *server.Server, driverService *service.DriverService) *DriverHandler {
	return &DriverHandler{
		Handler:       NewHandler(s),
		driverService: driverService,
	}
}

func (h *DriverHandler) SetupProfile(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, payload *driver.CreateDriverRequest) (*driver.Driver, error) {
			claims, ok := c.Get("user").(*service.JWTClaims)
			if !ok {
				return nil, echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
			}

			return h.driverService.CreateProfile(c.Request().Context(),
				claims.UserID, payload)
		},
		http.StatusCreated,
		&driver.CreateDriverRequest{},
	)(c)
}

// UpdateProfile handle updating driver profile
func (h *DriverHandler) UpdateProfile(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, payload *driver.CreateDriverRequest) (*driver.Driver, error) {
			userID, ok := c.Get("user_id").(string)
			if !ok {
				return nil, echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
			}

			uid, err := uuid.Parse(userID)
			if err != nil {
				return nil, echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
			}

			return h.driverService.UpdateProfile(c.Request().Context(), uid, payload)
		},
		http.StatusOK, // 200 OK
		&driver.CreateDriverRequest{},
	)(c)
}

// GetProfile handle getting driver profile
func (h *DriverHandler) GetProfile(c echo.Context) error {
	userID, ok := c.Get("user_id").(string)
	if !ok {
		return echo.NewHTTPError(http.StatusUnauthorized, "Unauthorized")
	}

	uid, err := uuid.Parse(userID)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Invalid user ID")
	}

	driver, err := h.driverService.GetProfile(c.Request().Context(), uid)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, driver)
}
