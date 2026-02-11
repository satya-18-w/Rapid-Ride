package model

import "time"

// PaymentStatus represents the status of a payment
type PaymentStatusType string

const (
	PaymentStatusTypeCreated    PaymentStatusType = "created"
	PaymentStatusTypePending    PaymentStatusType = "pending"
	PaymentStatusTypeAuthorized PaymentStatusType = "authorized"
	PaymentStatusTypeCaptured   PaymentStatusType = "captured"
	PaymentStatusTypeFailed     PaymentStatusType = "failed"
	PaymentStatusTypeRefunded   PaymentStatusType = "refunded"
)

// Payment represents a payment in the system
type Payment struct {
	ID                string            `json:"id" db:"id"`
	RideID            string            `json:"ride_id" db:"ride_id"`
	UserID            string            `json:"user_id" db:"user_id"`
	Amount            float64           `json:"amount" db:"amount"`
	Currency          string            `json:"currency" db:"currency"`
	RazorpayOrderID   *string           `json:"razorpay_order_id,omitempty" db:"razorpay_order_id"`
	RazorpayPaymentID *string           `json:"razorpay_payment_id,omitempty" db:"razorpay_payment_id"`
	RazorpaySignature *string           `json:"razorpay_signature,omitempty" db:"razorpay_signature"`
	Status            PaymentStatusType `json:"status" db:"status"`
	PaymentMethod     string            `json:"payment_method" db:"payment_method"`
	CreatedAt         time.Time         `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at" db:"updated_at"`
}

// CreatePaymentOrderRequest represents a request to create a payment order
type CreatePaymentOrderRequest struct {
	RideID        string  `json:"ride_id" validate:"required"`
	Amount        float64 `json:"amount" validate:"required,gt=0"`
	PaymentMethod string  `json:"payment_method" validate:"required,oneof=cash upi card wallet"`
}

// CreatePaymentOrderResponse represents the response for creating a payment order
type CreatePaymentOrderResponse struct {
	PaymentID       string  `json:"payment_id"`
	RazorpayOrderID *string `json:"razorpay_order_id,omitempty"`
	RazorpayKeyID   *string `json:"razorpay_key_id,omitempty"`
	Amount          float64 `json:"amount"`
	Currency        string  `json:"currency"`
	PaymentMethod   string  `json:"payment_method"`
}



// VerifyPaymentRequest represents a request to verify payment
type VerifyPaymentRequest struct {
	PaymentID         string `json:"payment_id" validate:"required"`
	RazorpayOrderID   string `json:"razorpay_order_id" validate:"required"`
	RazorpayPaymentID string `json:"razorpay_payment_id" validate:"required"`
	RazorpaySignature string `json:"razorpay_signature" validate:"required"`
}



// UPIPaymentRequest represents a UPI payment request
type UPIPaymentRequest struct {
	PaymentID string `json:"payment_id" validate:"required"`
	UPIID     string `json:"upi_id" validate:"required"`
}

// CardPaymentRequest represents a card payment request
type CardPaymentRequest struct {
	PaymentID  string `json:"payment_id" validate:"required"`
	CardNumber string `json:"card_number" validate:"required"`
	ExpiryDate string `json:"expiry_date" validate:"required"`
	CVV        string `json:"cvv" validate:"required"`
	CardHolder string `json:"card_holder" validate:"required"`
}

// CashPaymentRequest represents a cash payment confirmation
type CashPaymentRequest struct {
	PaymentID string `json:"payment_id" validate:"required"`
}
