package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model/driver"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
)

type DriverRepository struct {
	server *server.Server
}

func NewDriverRepository(s *server.Server) *DriverRepository {
	return &DriverRepository{server: s}
}

func (r *DriverRepository) Create(ctx context.Context, d *driver.Driver) error {
	// Note: Column names match the database schema (including typos)
	query := `
		INSERT INTO drivers (
			id, user_id, vechile_type, vechile_number, 
			is_available, rating, capasity, total_rides, 
			created_at, updated_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, created_at, updated_at
	`

	err := r.server.DB.Pool.QueryRow(
		ctx,
		query,
		d.ID,
		d.UserID,
		d.VehicleType,
		d.VehicleNumber,
		d.IsAvailable,
		d.Rating,
		d.Capacity,
		d.TotalRides,
		d.CreatedAt,
		d.UpdatedAt,
	).Scan(&d.ID, &d.CreatedAt, &d.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create driver profile: %w", err)
	}

	return nil
}

func (r *DriverRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*driver.Driver, error) {
	query := `
		SELECT 
			id, user_id, vechile_type, vechile_number, 
			is_available, rating, capasity, total_rides, 
			created_at, updated_at
		FROM drivers
		WHERE user_id = $1
	`

	var d driver.Driver
	err := r.server.DB.Pool.QueryRow(ctx, query, userID).Scan(
		&d.ID,
		&d.UserID,
		&d.VehicleType,
		&d.VehicleNumber,
		&d.IsAvailable,
		&d.Rating,
		&d.Capacity,
		&d.TotalRides,
		&d.CreatedAt,
		&d.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil // Return nil if not found
		}
		return nil, fmt.Errorf("failed to get driver profile: %w", err)
	}

	return &d, nil
}
