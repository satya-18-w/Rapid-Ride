package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"

	"github.com/satya-18-w/RAPID-RIDE/backend/internal/errs"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/repository"
)

type PaymentService interface {
	CreatePaymentOrder(ctx context.Context, userID string, req *model.CreatePaymentOrderRequest) (*model.CreatePaymentOrderResponse, error)
	VerifyPayment(ctx context.Context, req *model.VerifyPaymentRequest) error
	ProcessCashPayment(ctx context.Context, userID string, req *model.CashPaymentRequest) error
	ProcessUPIPayment(ctx context.Context, userID string, req *model.UPIPaymentRequest) error
	GetPaymentByID(ctx context.Context, paymentID string) (*model.Payment, error)
	GetPaymentByRideID(ctx context.Context, rideID string) (*model.Payment, error)
}

type paymentService struct {
	paymentRepo    repository.PaymentRepository
	rideRepo       repository.RideRepository
	razorpayKey    string
	razorpaySecret string
}

func NewPaymentService(
	paymentRepo repository.PaymentRepository,
	rideRepo repository.RideRepository,
) PaymentService {
	return &paymentService{
		paymentRepo:    paymentRepo,
		rideRepo:       rideRepo,
		razorpayKey:    getEnv("RAZORPAY_KEY_ID", ""),
		razorpaySecret: getEnv("RAZORPAY_KEY_SECRET", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}



func (s *paymentService) CreatePaymentOrder(ctx context.Context, userID string, req *model.CreatePaymentOrderRequest) (*model.CreatePaymentOrderResponse, error) {
	// Verify ride exists and belongs to user
	ride, err := s.rideRepo.GetByID(ctx, req.RideID)
	if err != nil {
		return nil, errs.NewBadRequest("ride not found")
	}

	if ride.UserID != userID {
		return nil, errs.NewUnauthorized("unauthorized access to ride")
	}


	
	// Create payment record
	payment := &model.Payment{
		RideID:        req.RideID,
		UserID:        userID,
		Amount:        req.Amount,
		Currency:      "INR",
		Status:        model.PaymentStatusTypeCreated,
		PaymentMethod: req.PaymentMethod,
	}

	// For cash payments, no Razorpay order needed
	if req.PaymentMethod == "cash" {
		payment.Status = model.PaymentStatusTypePending
		if err := s.paymentRepo.Create(ctx, payment); err != nil {
			return nil, errs.NewInternalServerError()
		}

		return &model.CreatePaymentOrderResponse{
			PaymentID:     payment.ID,
			Amount:        payment.Amount,
			Currency:      payment.Currency,
			PaymentMethod: payment.PaymentMethod,
		}, nil
	}

	// For online payments (UPI, card, wallet), create Razorpay order
	// Note: In production, you would integrate with Razorpay SDK here
	// For now, we'll simulate the order creation
	if s.razorpayKey != "" && s.razorpaySecret != "" {
		// TODO: Integrate actual Razorpay SDK
		// orderID, err := createRazorpayOrder(req.Amount)
		// For now, generate a mock order ID
		orderID := fmt.Sprintf("order_%s", payment.ID)
		payment.RazorpayOrderID = &orderID
	}

	if err := s.paymentRepo.Create(ctx, payment); err != nil {
		return nil, errs.NewInternalServerError()
	}

	response := &model.CreatePaymentOrderResponse{
		PaymentID:       payment.ID,
		RazorpayOrderID: payment.RazorpayOrderID,
		Amount:          payment.Amount,
		Currency:        payment.Currency,
		PaymentMethod:   payment.PaymentMethod,
	}

	if s.razorpayKey != "" {
		response.RazorpayKeyID = &s.razorpayKey
	}

	return response, nil
}

func (s *paymentService) VerifyPayment(ctx context.Context, req *model.VerifyPaymentRequest) error {
	// Get payment
	payment, err := s.paymentRepo.GetByID(ctx, req.PaymentID)
	if err != nil {
		return errs.NewBadRequest("payment not found")
	}

	// Verify Razorpay signature
	if s.razorpaySecret != "" {
		if !s.verifyRazorpaySignature(req.RazorpayOrderID, req.RazorpayPaymentID, req.RazorpaySignature) {
			payment.Status = model.PaymentStatusTypeFailed
			s.paymentRepo.Update(ctx, payment)
			return errs.NewBadRequest("invalid payment signature")
		}
	}

	// Update payment status
	payment.Status = model.PaymentStatusTypeCaptured
	payment.RazorpayPaymentID = &req.RazorpayPaymentID
	payment.RazorpaySignature = &req.RazorpaySignature

	if err := s.paymentRepo.Update(ctx, payment); err != nil {
		return errs.NewInternalServerError()
	}

	// Update ride payment status
	ride, err := s.rideRepo.GetByID(ctx, payment.RideID)
	if err != nil {
		return err
	}

	if err := s.rideRepo.UpdatePaymentStatus(ctx, ride.ID, model.PaymentStatusCompleted, payment.ID); err != nil {
		return errs.NewInternalServerError()
	}

	return nil
}

func (s *paymentService) verifyRazorpaySignature(orderID, paymentID, signature string) bool {
	message := orderID + "|" + paymentID
	mac := hmac.New(sha256.New, []byte(s.razorpaySecret))
	mac.Write([]byte(message))
	expectedSignature := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

func (s *paymentService) ProcessCashPayment(ctx context.Context, userID string, req *model.CashPaymentRequest) error {
	// Get payment
	payment, err := s.paymentRepo.GetByID(ctx, req.PaymentID)
	if err != nil {
		return errs.NewBadRequest("payment not found")
	}

	// Verify payment belongs to user
	if payment.UserID != userID {
		return errs.NewUnauthorized("unauthorized access to payment")
	}

	// Verify it's a cash payment
	if payment.PaymentMethod != "cash" {
		return errs.NewBadRequest("not a cash payment")
	}

	// Update payment status to captured (completed)
	payment.Status = model.PaymentStatusTypeCaptured
	if err := s.paymentRepo.Update(ctx, payment); err != nil {
		return errs.NewInternalServerError()
	}

	// Update ride payment status
	ride, err := s.rideRepo.GetByID(ctx, payment.RideID)
	if err != nil {
		return err
	}

	if err := s.rideRepo.UpdatePaymentStatus(ctx, ride.ID, model.PaymentStatusCompleted, payment.ID); err != nil {
		return errs.NewInternalServerError()
	}

	return nil
}

func (s *paymentService) ProcessUPIPayment(ctx context.Context, userID string, req *model.UPIPaymentRequest) error {
	// Get payment
	payment, err := s.paymentRepo.GetByID(ctx, req.PaymentID)
	if err != nil {
		return errs.NewBadRequest("payment not found")
	}

	// Verify payment belongs to user
	if payment.UserID != userID {
		return errs.NewUnauthorized("unauthorized access to payment")
	}

	// In production, you would initiate UPI payment request here
	// For now, we'll just mark it as pending and expect verification later
	payment.Status = model.PaymentStatusTypePending
	if err := s.paymentRepo.Update(ctx, payment); err != nil {
		return errs.NewInternalServerError()
	}

	return nil
}

func (s *paymentService) GetPaymentByID(ctx context.Context, paymentID string) (*model.Payment, error) {
	return s.paymentRepo.GetByID(ctx, paymentID)
}

func (s *paymentService) GetPaymentByRideID(ctx context.Context, rideID string) (*model.Payment, error) {
	return s.paymentRepo.GetByRideID(ctx, rideID)
}
