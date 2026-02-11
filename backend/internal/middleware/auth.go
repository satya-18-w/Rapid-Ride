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

		m.server.Logger.Debug().
			Str("path", c.Request().URL.Path).
			Str("auth_header", authHeader).
			Msg("RequireAuth: Processing request")

		if authHeader != "" {
			// Extract token from "Bearer <token>"
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				token = parts[1]
				m.server.Logger.Debug().
					Str("token_preview", token[:min(20, len(token))]+"...").
					Msg("Token extracted from Authorization header")
			} else {
				m.server.Logger.Warn().
					Int("parts_count", len(parts)).
					Msg("Invalid Authorization header format")
			}
		}

		if token == "" {
			// Try to get from cookie
			cookie, err := c.Cookie("access_token")
			if err == nil {
				token = cookie.Value
				m.server.Logger.Debug().Msg("Token extracted from cookie")
			}
		}

		if token == "" {
			// Try to get from query param (for WebSockets)
			token = c.QueryParam("token")
			if token != "" {
				m.server.Logger.Debug().Msg("Token extracted from query param")
			}
		}

		if token == "" {
			m.server.Logger.Warn().
				Str("path", c.Request().URL.Path).
				Msg("No token found in request")
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "Missing or invalid authorization credentials",
			})
		}

		claims, err := m.authService.ValidateToken(token)
		if err != nil {
			m.server.Logger.Error().
				Err(err).
				Str("path", c.Request().URL.Path).
				Msg("Token validation failed")
			return c.JSON(http.StatusUnauthorized, map[string]string{
				"error": "Invalid or expired token",
			})
		}

		m.server.Logger.Debug().
			Str("user_id", claims.UserID.String()).
			Str("email", claims.Email).
			Str("role", string(claims.Role)).
			Msg("Authentication successful")

		// Set claims in context for use in handlers
		c.Set("user", claims)
		c.Set("user_id", claims.UserID.String())
		c.Set("role", string(claims.Role))
		c.Set("email", claims.Email)
		return next(c)
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
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
			m.server.Logger.Warn().
				Str("user_id", claims.UserID.String()).
				Str("email", claims.Email).
				Str("role", string(claims.Role)).
				Msg("Insufficient permissions")

			return c.JSON(http.StatusForbidden, map[string]string{
				"error": "Insufficient permissions",
			})
		}
	}
}
