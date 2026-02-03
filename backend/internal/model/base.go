package model

import (
	"time"

	"github.com/google/uuid"
)

type Base struct {
	ID        uuid.UUID `db:"id" json:"id"`
	CreatedAt time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt time.Time `json:"updatedAt" db:"updated_at"`
}
