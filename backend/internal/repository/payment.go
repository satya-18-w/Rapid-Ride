package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
)

type PaymentRepository interface {
	Create(ctx context.Context, payment *model.Payment) error
	GetByID(ctx context.Context, id string) (*model.Payment, error)
	GetByRideID(ctx context.Context, rideID string) (*model.Payment, error)
	Update(ctx context.Context, payment *model.Payment) error
	GetUserPayments(ctx context.Context, userID string, limit, offset int) ([]*model.Payment, error)
}

type paymentRepository struct {
	db *pgxpool.Pool
}

func NewPaymentRepository(db *pgxpool.Pool) PaymentRepository {
	return &paymentRepository{db: db}
}

func (r *paymentRepository) Create(ctx context.Context, payment *model.Payment) error {
	query := `
		INSERT INTO payments (
			id, ride_id, user_id, amount, currency, 
			razorpay_order_id, status, payment_method
		) VALUES (
			gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7
		) RETURNING id, created_at, updated_at
	`

	return r.db.QueryRow(ctx, query,
		payment.RideID,
		payment.UserID,
		payment.Amount,
		payment.Currency,
		payment.RazorpayOrderID,
		payment.Status,
		payment.PaymentMethod,
	).Scan(&payment.ID, &payment.CreatedAt, &payment.UpdatedAt)
}

func (r *paymentRepository) GetByID(ctx context.Context, id string) (*model.Payment, error) {
	var payment model.Payment
	query := `
		SELECT id, ride_id, user_id, amount, currency,
			razorpay_order_id, razorpay_payment_id, razorpay_signature,
			status, payment_method, created_at, updated_at
		FROM payments
		WHERE id = $1
	`

	err := r.db.QueryRow(ctx, query, id).Scan(
		&payment.ID,
		&payment.RideID,
		&payment.UserID,
		&payment.Amount,
		&payment.Currency,
		&payment.RazorpayOrderID,
		&payment.RazorpayPaymentID,
		&payment.RazorpaySignature,
		&payment.Status,
		&payment.PaymentMethod,
		&payment.CreatedAt,
		&payment.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &payment, nil
}

func (r *paymentRepository) GetByRideID(ctx context.Context, rideID string) (*model.Payment, error) {
	var payment model.Payment
	query := `
		SELECT id, ride_id, user_id, amount, currency,
			razorpay_order_id, razorpay_payment_id, razorpay_signature,
			status, payment_method, created_at, updated_at
		FROM payments
		WHERE ride_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`

	err := r.db.QueryRow(ctx, query, rideID).Scan(
		&payment.ID,
		&payment.RideID,
		&payment.UserID,
		&payment.Amount,
		&payment.Currency,
		&payment.RazorpayOrderID,
		&payment.RazorpayPaymentID,
		&payment.RazorpaySignature,
		&payment.Status,
		&payment.PaymentMethod,
		&payment.CreatedAt,
		&payment.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &payment, nil
}

func (r *paymentRepository) Update(ctx context.Context, payment *model.Payment) error {
	query := `
		UPDATE payments
		SET razorpay_payment_id = $1,
			razorpay_signature = $2,
			status = $3,
			updated_at = CURRENT_TIMESTAMP
		WHERE id = $4
		RETURNING updated_at
	`

	return r.db.QueryRow(ctx, query,
		payment.RazorpayPaymentID,
		payment.RazorpaySignature,
		payment.Status,
		payment.ID,
	).Scan(&payment.UpdatedAt)
}

func (r *paymentRepository) GetUserPayments(ctx context.Context, userID string, limit, offset int) ([]*model.Payment, error) {
	query := `
		SELECT id, ride_id, user_id, amount, currency,
			razorpay_order_id, razorpay_payment_id, razorpay_signature,
			status, payment_method, created_at, updated_at
		FROM payments
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []*model.Payment
	for rows.Next() {
		var payment model.Payment
		err := rows.Scan(
			&payment.ID,
			&payment.RideID,
			&payment.UserID,
			&payment.Amount,
			&payment.Currency,
			&payment.RazorpayOrderID,
			&payment.RazorpayPaymentID,
			&payment.RazorpaySignature,
			&payment.Status,
			&payment.PaymentMethod,
			&payment.CreatedAt,
			&payment.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		payments = append(payments, &payment)
	}

	return payments, rows.Err()
}
