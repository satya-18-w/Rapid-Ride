package handler

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/middleware"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
)

type HealthHandler struct {
	Handler
}

func NewHealthHandler(s *server.Server) *HealthHandler {
	return &HealthHandler{
		Handler: NewHandler(s),
	}
}

func (h *HealthHandler) CheckHealth(c echo.Context) error {
	start := time.Now()
	logger := middleware.GetLogger(c).With().Str("Operation", "Health Check!").Logger()

	response := map[string]interface{}{
		"status":      "healthy",
		"timestamp":   time.Now().UTC(),
		"environment": h.server.Config.Primary.Env,
		"checks":      make(map[string]interface{}),
	}
	checks := response["checks"].(map[string]interface{})
	isHealthy := true

	// check database Connectivity

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	dbStart := time.Now()
	if err := h.server.DB.Pool.Ping(ctx); err != nil {
		checks["database"] = map[string]interface{}{
			"status":        "unhealthy",
			"response_time": time.Since(dbStart).String(),
			"error":         err.Error(),
		}
		isHealthy = false
		logger.Error().Err(err).Dur("response_time", time.Since(dbStart)).Msg("database health check failed")
		if h.server.LoggerService != nil && h.server.LoggerService.GetApplication() != nil {
			h.server.LoggerService.GetApplication().RecordCustomEvent(
				"HealthCheckError", map[string]interface{}{
					"check_type":       "database",
					"operation":        "health_check",
					"error_type":       "database_unhealthy",
					"response_time_ms": time.Since(dbStart).Milliseconds(),
					"error_message":    err.Error(),
				})
		}
	} else {
		checks["database"] = map[string]interface{}{
			"status":        "healthy",
			"response_time": time.Since(dbStart).String(),
		}
		logger.Info().Dur("response_time", time.Since(dbStart)).Msg("Database health CheckPassed")

	}

	// Database connection metrics are automitically captured by New Relic nrpgx5 integraion
	// check redis cache connectivity
	if h.server.Redis != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		redisStart := time.Now()
		cmd := h.server.Redis.Ping(ctx)
		if cmd.Err() != nil {
			checks["redis"] = map[string]interface{}{
				"status":        "unhealthy",
				"response_time": time.Since(redisStart).String(),
				"error":         cmd.Err().Error(),
			}

			logger.Error().Err(cmd.Err()).Dur("response_time", time.Since(redisStart)).Msg("Redis health check Failed")
			if h.server.LoggerService != nil && h.server.LoggerService.GetApplication() != nil {
				h.server.LoggerService.GetApplication().RecordCustomEvent(
					"HealthCheckError", map[string]interface{}{
						"checkType":        "redis",
						"operation":        "HealthCheck",
						"error_type":       "redis_unhealthy",
						"response_time_ms": time.Since(redisStart).Milliseconds(),
						"error_message":    cmd.Err().Error(),
					})
			}

		} else {
			checks["redis"] = map[string]interface{}{
				"status":        "healthy",
				"response_time": time.Since(redisStart).String(),
			}
			logger.Info().Dur("response_time", time.Since(redisStart)).Msg("redis Health Check passed")

		}

	}

	if !isHealthy {
		response["status"] = "Unhealthy"
		logger.Warn().Dur("Total_healthCheck_duration", time.Since(start)).Msg("Health check failed")
		if h.server.LoggerService != nil && h.server.LoggerService.GetApplication() != nil {
			h.server.LoggerService.GetApplication().RecordCustomEvent(
				"HealthCheckError", map[string]interface{}{
					"check_type":        "overall_health",
					"operation":         "health_check",
					"error_type":        "overall_unhealthy",
					"total_duration_ms": time.Since(start).Milliseconds(),
				},
			)
		}
		return c.JSON(http.StatusServiceUnavailable, response)

	}
	logger.Info().Dur("Total_HealthCheck_duration", time.Since(start)).Msg("Health check passed")
	err := c.JSON(http.StatusOK, response)

	if err != nil {
		logger.Error().Err(err).Msg("failed to write JSON response")
		if h.server.LoggerService != nil && h.server.LoggerService.GetApplication() != nil {
			h.server.LoggerService.GetApplication().RecordCustomEvent(
				"HealthCheckError", map[string]interface{}{
					"check_type":    "response",
					"operation":     "health_check",
					"error_type":    "json_response_error",
					"error_message": err.Error(),
				})
		}
		return fmt.Errorf("failed to write JSON response: %w", err)
	}

	return nil
}
