package middleware

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/service"
)

type AuthMiddleware struct {
	server      *server.Server
	authService *service.AuthService
}

func NewAuthMiddleware(s *server.Server, authService *service.AuthService) *AuthMiddleware {
	return &AuthMiddleware{
		server:      s,
		authService: authService,
	}
}

// RequireAuth validates JWT token and sets user claims in context
func (m *AuthMiddleware) RequireAuth(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		token := ""
		authHeader := c.Request().Header.Get("Authorization")

		if authHeader != "" {
			// Extract token from "Bearer <token>"
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				token = parts[1]
			}
		}

		if token == "" {
			// Try to get from cookie
			cookie, err := c.Cookie("access_token")
			if err == nil {
				token = cookie.Value
			}
		}

		if token == "" {
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "Missing or invalid authorization credentials",
			})
		}
		claims, err := m.authService.ValidateToken(token)
		if err != nil {
			m.server.Logger.Error().Err(err).Msg("Token validation failed")
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "Invalid or expired token",
			})
		}

		// Set claims in context for use in handlers
		c.Set("user", claims)
		return next(c)
	}
}

// RequireRole validates that the authenticated user has one of the specified roles
func (m *AuthMiddleware) RequireRole(roles ...model.UserRole) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			claims, ok := c.Get("user").(*service.JWTClaims)
			if !ok {
				return c.JSON(http.StatusUnauthorized, map[string]string{
					"error": "Unauthorized",
				})
			}

			// Check if user has required role
			for _, role := range roles {
				if claims.Role == role {
					return next(c)
				}
			}

			return c.JSON(http.StatusForbidden, map[string]string{
				"error": "Insufficient permissions",
			})
		}
	}
}
