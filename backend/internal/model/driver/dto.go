package driver

type CreateDriverRequest struct {
	VehicleType   string `json:"vehicle_type" validate:"required,oneof=bike car auto suv"`
	VehicleNumber string `json:"vehicle_number" validate:"required,min=4,max=20"`
	Capacity      int    `json:"capacity" validate:"required,min=1"`
}

func (r *CreateDriverRequest) Validate() error {
	return validate.Struct(r)
}
