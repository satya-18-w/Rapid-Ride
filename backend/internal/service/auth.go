package service

import (
	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/satya-18-w/go-boilerplate/internal/server"
)

type AuthService struct {
	server *server.Server
}


func NewAuthService(s *server.Server) *AuthService{
	clerk.SetKey(s.Config.Auth.SecretKey)
	return &AuthService{
		server: s,
	}
}



