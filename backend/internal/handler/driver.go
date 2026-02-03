package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model/driver"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/service"
)

type DriverHandler struct{
	Handler
	driverService *service.DriverService

}


func NewDriverHandler( s *server.Server, driverService *service.DriverService) *DriverHandler{
	return &DriverHandler{
		Handler: NewHandler(s),
		driverService: driverService,


	}
}



func (h *DriverHandler) SetupProfile( c echo.Context) error{
	return Handle(
		h.Handler,
		func( c echo.Context, payload *driver.CreateDriverRequest) (*driver.Driver, error){
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