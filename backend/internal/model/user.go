package model

import (
	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

type UserRole string

const (
	RoleRider  UserRole = "rider"
	RoleDriver UserRole = "driver"
	RoleAdmin  UserRole = "admin"
)

type User struct {
	Base
	Name         string   `db:"name" json:"name"`
	Email        string   `db:"email" json:"email"`
	PasswordHash string   `db:"password_hash" json:"-"`
	Phone        *string  `db:"phone" json:"phone,omitempty"`
	Role         UserRole `db:"role" json:"role"`
}

type SignupRequest struct {
	Name     string   `json:"name" validate:"required,min=2,max=100"`
	Email    string   `json:"email" validate:"required,email"`
	Password string   `json:"password" validate:"required,min=8,max=72"`
	Phone    string   `json:"phone,omitempty" validate:"omitempty,e164"`
	Role     UserRole `json:"role" validate:"required,oneof=rider driver"`
}

func (r *SignupRequest) Validate() error {
	return validate.Struct(r)
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

func (r *LoginRequest) Validate() error {
	return validate.Struct(r)
}

type SendOTPRequest struct {
	Email string   `json:"email" validate:"required,email"`
	Role  UserRole `json:"role" validate:"required,oneof=rider driver"`
}

func (r *SendOTPRequest) Validate() error {
	return validate.Struct(r)
}

type VerifyOTPRequest struct {
	Email string   `json:"email" validate:"required,email"`
	OTP   string   `json:"otp" validate:"required,len=6"`
	Role  UserRole `json:"role" validate:"required,oneof=rider driver"`
}

func (r *VerifyOTPRequest) Validate() error {
	return validate.Struct(r)
}

type AuthResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}
