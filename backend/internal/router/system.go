package router

import (
	"github.com/labstack/echo/v4"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/handler"
)

func registerSystemRouter(r *echo.Echo, h *handler.Handlers){
	r.GET("/status",h.Health.CheckHealth)
	r.Static("/static","static")
	r.GET("/docs",h.OpenAPI.ServeOpenAPIUI)
}
