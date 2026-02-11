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
	fmt.Println("DriverRepository.GetByUserID", userID)
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

func (r *DriverRepository) GetByID(ctx context.Context, id uuid.UUID) (*driver.Driver, error) {
	query := `
		SELECT 
			id, user_id, vechile_type, vechile_number, 
			is_available, rating, capasity, total_rides, 
			created_at, updated_at
		FROM drivers
		WHERE id = $1
	`

	var d driver.Driver
	err := r.server.DB.Pool.QueryRow(ctx, query, id).Scan(
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
		return nil, fmt.Errorf("failed to get driver profile by id: %w", err)
	}

	return &d, nil
}

// Update updates a driver's profile
func (r *DriverRepository) Update(ctx context.Context, d *driver.Driver) error {
	query := `
		UPDATE drivers
		SET vechile_type = $1, vechile_number = $2, capasity = $3, updated_at = $4
		WHERE user_id = $5
	`

	// Note: 'capasity' and 'vechile_type' typos match the schema used in Create/Get
	result, err := r.server.DB.Pool.Exec(ctx, query,
		d.VehicleType,
		d.VehicleNumber,
		d.Capacity,
		d.UpdatedAt,
		d.UserID,
	)

	if err != nil {
		return fmt.Errorf("failed to update driver profile: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("driver profile not found")
	}

	return nil
}
