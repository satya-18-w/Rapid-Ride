package handler

import (
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/errs"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/middleware"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/service"
)

type PaymentHandler struct {
	paymentService service.PaymentService
}

func NewPaymentHandler(paymentService service.PaymentService) *PaymentHandler {
	return &PaymentHandler{
		paymentService: paymentService,
	}
}

// CreatePaymentOrder creates a payment order for a ride
// @Summary Create payment order
// @Description Create a payment order for a ride
// @Tags payments
// @Accept json
// @Produce json
// @Param request body model.CreatePaymentOrderRequest true "Payment order request"
// @Success 200 {object} model.CreatePaymentOrderResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/v1/rider/payments/create [post]
func (h *PaymentHandler) CreatePaymentOrder(c echo.Context) error {
	ctx := c.Request().Context()
	userID := c.Get(middleware.UserIDKey).(string)

	var req model.CreatePaymentOrderRequest
	if err := c.Bind(&req); err != nil {
		return errs.NewBadRequest("invalid request body")
	}

	if err := c.Validate(&req); err != nil {
		return err
	}

	response, err := h.paymentService.CreatePaymentOrder(ctx, userID, &req)
	if err != nil {
		return err
	}

	return c.JSON(http.StatusOK, response)
}

// VerifyPayment verifies a Razorpay payment
// @Summary Verify payment
// @Description Verify a Razorpay payment signature
// @Tags payments
// @Accept json
// @Produce json
// @Param request body model.VerifyPaymentRequest true "Payment verification request"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/v1/rider/payments/verify [post]
func (h *PaymentHandler) VerifyPayment(c echo.Context) error {
	ctx := c.Request().Context()

	var req model.VerifyPaymentRequest
	if err := c.Bind(&req); err != nil {
		return errs.NewBadRequest("invalid request body")
	}

	if err := c.Validate(&req); err != nil {
		return err
	}

	if err := h.paymentService.VerifyPayment(ctx, &req); err != nil {
		return err
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "payment verified successfully",
	})
}

// ProcessCashPayment marks a cash payment as completed
// @Summary Process cash payment
// @Description Mark a cash payment as completed after ride completion
// @Tags payments
// @Accept json
// @Produce json
// @Param request body model.CashPaymentRequest true "Cash payment request"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/v1/rider/payments/cash [post]
func (h *PaymentHandler) ProcessCashPayment(c echo.Context) error {
	ctx := c.Request().Context()
	userID := c.Get(middleware.UserIDKey).(string)

	var req model.CashPaymentRequest
	if err := c.Bind(&req); err != nil {
		return errs.NewBadRequest("invalid request body")
	}

	if err := c.Validate(&req); err != nil {
		return err
	}

	if err := h.paymentService.ProcessCashPayment(ctx, userID, &req); err != nil {
		return err
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "cash payment processed successfully",
	})
}

// ProcessUPIPayment initiates a UPI payment
// @Summary Process UPI payment
// @Description Initiate a UPI payment
// @Tags payments
// @Accept json
// @Produce json
// @Param request body model.UPIPaymentRequest true "UPI payment request"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Security BearerAuth
// @Router /api/v1/rider/payments/upi [post]
func (h *PaymentHandler) ProcessUPIPayment(c echo.Context) error {
	ctx := c.Request().Context()
	userID := c.Get(middleware.UserIDKey).(string)

	var req model.UPIPaymentRequest
	if err := c.Bind(&req); err != nil {
		return errs.NewBadRequest("invalid request body")
	}

	if err := c.Validate(&req); err != nil {
		return err
	}

	if err := h.paymentService.ProcessUPIPayment(ctx, userID, &req); err != nil {
		return err
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "upi payment initiated successfully",
	})
}

// GetPaymentByRideID gets payment information for a ride
// @Summary Get payment by ride ID
// @Description Get payment information for a specific ride
// @Tags payments
// @Produce json
// @Param ride_id path string true "Ride ID"
// @Success 200 {object} model.Payment
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Security BearerAuth
// @Router /api/v1/rider/payments/ride/{ride_id} [get]
func (h *PaymentHandler) GetPaymentByRideID(c echo.Context) error {
	ctx := c.Request().Context()
	rideID := c.Param("ride_id")

	payment, err := h.paymentService.GetPaymentByRideID(ctx, rideID)
	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{"error": "payment not found"})
	}

	return c.JSON(http.StatusOK, payment)
}
