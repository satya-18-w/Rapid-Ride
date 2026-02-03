package model

// Location represents a geographic coordinate
type Location struct {
	Latitude  float64 `json:"latitude" validate:"required,latitude"`
	Longitude float64 `json:"longitude" validate:"required,longitude"`
}

// LocationUpdate represents a driver's location update
type LocationUpdate struct {
	DriverID string   `json:"driver_id" validate:"required,uuid"`
	Location Location `json:"location" validate:"required"`
	Heading  float64  `json:"heading,omitempty" validate:"omitempty,min=0,max=360"`
	Speed    float64  `json:"speed,omitempty" validate:"omitempty,min=0"`
}

// NearbyDriver represents a driver near a location
type NearbyDriver struct {
	DriverID      string   `json:"driver_id"`
	Name          string   `json:"name"`
	VehicleType   string   `json:"vehicle_type"`
	VehicleNumber string   `json:"vehicle_number"`
	Rating        float64  `json:"rating"`
	Location      Location `json:"location"`
	DistanceKm    float64  `json:"distance_km"`
	IsAvailable   bool     `json:"is_available"`
}

// NearbyDriversRequest represents a request to find nearby drivers
type NearbyDriversRequest struct {
	Location Location `json:"location"`
	RadiusKm float64  `json:"radius_km,omitempty"` // Optional, defaults to 5km
	Limit    int      `json:"limit,omitempty"`     // Optional, defaults to 20
}

type NearByDriversResponseFromRedis struct{
	ID   string `json:"id"`
	Distance float64 `json:"distance"`
	Latitude float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// Validate methods
func (l *LocationUpdate) Validate() error {
	return nil
}

func (n *NearbyDriversRequest) Validate() error {
	return nil
}
