package middleware

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	clerkhttp "github.com/clerk/clerk-sdk-go/v2/http"
	"github.com/labstack/echo/v4"
	"github.com/satya-18-w/go-boilerplate/internal/errs"
	"github.com/satya-18-w/go-boilerplate/internal/server"
)

type AuthMiddleware struct {
	server *server.Server
}
func NewAuthMiddleware(s *server.Server) *AuthMiddleware{
	return &AuthMiddleware{
		server: s,

		}
}



func (auth *AuthMiddleware) RequireAuth(next echo.HandlerFunc) echo.HandlerFunc{
	return echo.WrapMiddleware(
		clerkhttp.WithHeaderAuthorization(
			clerkhttp.AuthorizationFailureHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request){
				start:=time.Now()
				w.Header().Set("Content-Type","application/json")
				w.WriteHeader(http.StatusUnauthorized)

				response:=map[string]string{
					"code":"UNAUTHORIZED",
					"message":"Unauthorized",
					"override":"false",
					"status":"401",
				}
				if err:= json.NewEncoder(w).Encode(response); err != nil{
					auth.server.Logger.Error().Err(err).Str("Function","RequireAuth").Dur(
						"duration",time.Since(start)).Msg("Failed to write JSON Response")
				}else{
					auth.server.Logger.Error().Str("function","RequireAuth").Dur("duration",time.Since(start)).Msg("Could not get session Claims from context")

				}
			}))))(func(c echo.Context) error{
				start:=time.Now()

				// func clerk.SessionClaimsFromContext(ctx context.Context) (*clerk.SessionClaims, bool)
				// SessionClaimsFromContext returns the active session claims from the context.
				claims,ok:=clerk.SessionClaimsFromContext(c.Request().Context())

				if !ok{
					auth.server.Logger.Error().
					Str("function","RequireAuth").
					Str("requestId",GetRequestID(c)).
					Dur("duration",time.Since(start)).
					Msg("Could not get Session claims from context")
					return errs.NewUnauthorizedError("Unauthorized",false)
				}


				c.Set("User_id",claims.Subject)
				c.Set("User_Role",claims.ActiveOrganizationID)
				c.Set("permission",claims.Claims.ActiveOrganizationPermissions)
				auth.server.Logger.Info().
				Str("function","RequireAuth").
				Str("user_ID",claims.Subject).
				Str("request_ID",GetRequestID(c)).
				Dur("duration",time.Since(start)).
				Msg("User Authenticated Sussesfully")
				return next(c)
			})
}