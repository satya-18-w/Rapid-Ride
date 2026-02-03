package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	mrand "math/rand"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/lib/job"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/repository"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	server *server.Server
	repo   *repository.Repositories
}

type JWTClaims struct {
	UserID uuid.UUID      `json:"user_id"`
	Email  string         `json:"email"`
	Role   model.UserRole `json:"role"`
	jwt.RegisteredClaims
}

func NewAuthService(s *server.Server, repo *repository.Repositories) *AuthService {
	return &AuthService{
		server: s,
		repo:   repo,
	}
}

func (s *AuthService) Signup(ctx context.Context, req *model.SignupRequest) (*model.AuthResponse, error) {
	// Check if email already exists
	exists, err := s.repo.User.EmailExists(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("failed to check email existence: %w", err)
	}
	if exists {
		return nil, fmt.Errorf("email already registered")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	// Create user
	user := &model.User{
		Base: model.Base{
			ID:        uuid.New(),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		Role:         req.Role,
	}

	if req.Phone != "" {
		user.Phone = &req.Phone
	}

	if err := s.repo.User.Create(ctx, user); err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	// Generate JWT token
	token, err := s.generateToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &model.AuthResponse{
		Token: token,
		User:  user,
	}, nil
}

func (s *AuthService) Login(ctx context.Context, req *model.LoginRequest) (*model.AuthResponse, error) {
	// Get user by email
	user, err := s.repo.User.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, fmt.Errorf("invalid email or password")
	}

	// Generate JWT token
	token, err := s.generateToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &model.AuthResponse{
		Token: token,
		User:  user,
	}, nil

}

func (s *AuthService) SendOTP(ctx context.Context, req *model.SendOTPRequest) error {
	// Check if user exists
	user, err := s.repo.User.GetByEmail(ctx, req.Email)
	if err != nil {
		// For security, don't reveal if user exists or not, but for now we return error for debugging/clarity
		// In production, we might want to return nil even if user not found to prevent enumeration
		return fmt.Errorf("user not found")
	}

	if user.Role != req.Role {
		return fmt.Errorf("role mismatch")
	}

	// Generate OTP
	otp := s.generateOTP()

	// Store in Redis
	key := fmt.Sprintf("otp:%s", req.Email)
	if err := s.server.Redis.Set(ctx, key, otp, 10*time.Minute).Err(); err != nil {
		return fmt.Errorf("failed to store otp: %w", err)
	}

	// Send Email
	task, err := job.NewOTPEmailTask(req.Email, otp)
	if err != nil {
		return fmt.Errorf("failed to create email task: %w", err)
	}

	if _, err := s.server.Job.Client.Enqueue(task); err != nil {
		return fmt.Errorf("failed to enqueue email task: %w", err)
	}

	return nil
}

func (s *AuthService) VerifyOTP(ctx context.Context, req *model.VerifyOTPRequest) (*model.AuthResponse, error) {
	// Get OTP from Redis
	key := fmt.Sprintf("otp:%s", req.Email)
	storedOTP, err := s.server.Redis.Get(ctx, key).Result()
	if err != nil {
		return nil, fmt.Errorf("invalid or expired otp")
	}

	if storedOTP != req.OTP {
		return nil, fmt.Errorf("invalid otp")
	}

	// Get user
	user, err := s.repo.User.GetByEmail(ctx, req.Email)
	if err != nil {
		return nil, fmt.Errorf("user not found")
	}

	if user.Role != req.Role {
		return nil, fmt.Errorf("role mismatch")
	}

	// Delete OTP
	s.server.Redis.Del(ctx, key)

	// Generate Token
	token, err := s.generateToken(user)
	if err != nil {
		return nil, fmt.Errorf("failed to generate token: %w", err)
	}

	return &model.AuthResponse{
		Token: token,
		User:  user,
	}, nil
}

func (s *AuthService) generateOTP() string {
	rng := mrand.New(mrand.NewSource(time.Now().UnixNano()))
	return strconv.Itoa(100000 + rng.Intn(900000))
}

func (s *AuthService) generateToken(user *model.User) (string, error) {
	claims := JWTClaims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Subject:   user.ID.String(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Get secret key from config
	secretKey := s.server.Config.Auth.SecretKey
	if secretKey == "" {
		// Generate a random secret key if not configured (not recommended for production)
		key := make([]byte, 32)
		if _, err := rand.Read(key); err != nil {
			return "", fmt.Errorf("failed to generate secret key: %w", err)
		}
		secretKey = base64.StdEncoding.EncodeToString(key)
	}

	tokenString, err := token.SignedString([]byte(secretKey))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

func (s *AuthService) ValidateToken(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.server.Config.Auth.SecretKey), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}
