package driver

import (
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
)

var validate = validator.New()

type Driver struct {
	model.Base
	UserID        uuid.UUID `db:"user_id" json:"user_id"`
	VehicleType   string    `db:"vechile_type" json:"vehicle_type"`     // Maps to 'vechile_type' in DB
	VehicleNumber string    `db:"vechile_number" json:"vehicle_number"` // Maps to 'vechile_number' in DB
	IsAvailable   bool      `db:"is_available" json:"is_available"`
	Rating        float64   `db:"rating" json:"rating"`
	Capacity      int       `db:"capasity" json:"capacity"` // Maps to 'capasity' in DB
	TotalRides    int       `db:"total_rides" json:"total_rides"`
	// Location is handled separately due to PostGIS type
}

