package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/service"
)

type AuthHandler struct {
	Handler
	authService *service.AuthService
}

func NewAuthHandler(s *server.Server, authService *service.AuthService) *AuthHandler {
	return &AuthHandler{
		Handler:     NewHandler(s),
		authService: authService,
	}
}

// Signup handles user registration
func (h *AuthHandler) Signup(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, payload *model.SignupRequest) (*model.AuthResponse, error) {
			resp, err := h.authService.Signup(c.Request().Context(), payload)
			if err != nil {
				return nil, err
			}

			// Set HTTP-only cookie
			cookie := new(http.Cookie)
			cookie.Name = "access_token"
			cookie.Value = resp.Token
			cookie.Path = "/"
			cookie.HttpOnly = true
			cookie.SameSite = http.SameSiteLaxMode
			// In production, set Secure: true
			// cookie.Secure = true
			c.SetCookie(cookie)

			return resp, nil
		},
		http.StatusCreated,
		&model.SignupRequest{},
	)(c)
}

// Login handles user authentication
func (h *AuthHandler) Login(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, payload *model.LoginRequest) (*model.AuthResponse, error) {
			resp, err := h.authService.Login(c.Request().Context(), payload)
			if err != nil {
				return nil, err
			}

			// Set HTTP-only cookie
			cookie := new(http.Cookie)
			cookie.Name = "access_token"
			cookie.Value = resp.Token
			cookie.Path = "/"
			cookie.HttpOnly = true
			cookie.SameSite = http.SameSiteLaxMode
			// In production, set Secure: true
			// cookie.Secure = true
			c.SetCookie(cookie)

			return resp, nil
		},
		http.StatusOK,
		&model.LoginRequest{},
	)(c)
}

func (h *AuthHandler) SignOut(c echo.Context) error {
	// Clear the authentication cookie
	c.SetCookie(&http.Cookie{
		Name:     "access_token",
		Value:    "",
		HttpOnly: true,
		Secure:   false, // Set to true in production with HTTPS
		Path:     "/",
		MaxAge:   -1, // Negative MaxAge deletes the cookie immediately
		SameSite: http.SameSiteLaxMode,
	})

	return c.NoContent(http.StatusNoContent)
}

// Me returns the authenticated user's information
func (h *AuthHandler) Me(c echo.Context) error {
	claims, ok := c.Get("user").(*service.JWTClaims)
	if !ok {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "Unauthorized",
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"user_id": claims.UserID,
		"email":   claims.Email,
		"role":    claims.Role,
	})
}

func (h *AuthHandler) SendOTP(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, payload *model.SendOTPRequest) (string, error) {
			err := h.authService.SendOTP(c.Request().Context(), payload)
			if err != nil {
				return "", err
			}
			return "OTP sent successfully", nil
		},
		http.StatusOK,
		&model.SendOTPRequest{},
	)(c)
}

func (h *AuthHandler) VerifyOTP(c echo.Context) error {
	return Handle(
		h.Handler,
		func(c echo.Context, payload *model.VerifyOTPRequest) (*model.AuthResponse, error) {
			resp, err := h.authService.VerifyOTP(c.Request().Context(), payload)
			if err != nil {
				return nil, err
			}

			// Set HTTP-only cookie
			cookie := new(http.Cookie)
			cookie.Name = "access_token"
			cookie.Value = resp.Token
			cookie.Path = "/"
			cookie.HttpOnly = true
			cookie.SameSite = http.SameSiteLaxMode
			c.SetCookie(cookie)

			return resp, nil
		},
		http.StatusOK,
		&model.VerifyOTPRequest{},
	)(c)
}
