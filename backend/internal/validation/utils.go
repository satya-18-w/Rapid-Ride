package validation

import (
	"fmt"
	"reflect"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/labstack/echo/v4"
	"github.com/satya-18-w/go-boilerplate/internal/errs"
)

type Validatable interface {
	Validate() error
}

type CustomValidationError struct {
	Field   string
	Message string
}

type CustomValidationErrors []CustomValidationError

func (c *CustomValidationErrors) Error() string {
	return "validation Failed"

}

func BindAndvalidate(c echo.Context, payload Validatable) error {

	if err := c.Bind(payload); err != nil {
		message := strings.Split(strings.Split(err.Error(), ",")[1], "message=")[1]
		return errs.NewBadRequestError(message, false, nil, nil, nil)
	}

	if msg, fieldError := ValidateStruct(payload); fieldError != nil {
		return errs.NewBadRequestError(msg, true, nil, fieldError, nil)

	}
	return nil
}

func ValidateStruct(payload Validatable) (string, []errs.FieldError) {
	if err := payload.Validate(); err != nil {
		return extractValidationErrors(err)
	}
	return "", nil
}

func extractValidationErrors(err error) (string, []errs.FieldError) {
	var fieldErrors []errs.FieldError
	validationErrors, ok := err.(validator.ValidationErrors)
	if !ok {
		if customValidationErrors, ok := err.(*CustomValidationErrors); ok {
			for _, fieldError := range *customValidationErrors {
				fieldErrors = append(fieldErrors, errs.FieldError{
					Field: fieldError.Field,
					Error: fieldError.Message,
				})
			}
		}
	}

	for _, err := range validationErrors {
		field := strings.ToLower(err.Field())
		var msg string
		switch err.Tag() {
		case "required":
			msg = "is requored"

		case "min":
			if err.Type().Kind() == reflect.String {
				msg = fmt.Sprintf("Must be at least %s characters ", err.Param())
			} else {
				msg = fmt.Sprintf("Must be at least %s ", err.Param())
			}

		case "max":
			if err.Type().Kind() == reflect.String {
				msg = fmt.Sprintf("Must not exceed %s characters", err.Param())
			} else {
				msg = fmt.Sprintf("Must not exceed %s", err.Param())
			}

		case "oneof":
			msg = fmt.Sprintf("Must be one of : %s", err.Param())

		case "email":
			msg = "Must be a valid email address"

		case "e164":
			msg = " Must be a valid Phone number with country code"

		case "uuid":
			msg = "Must be a Valid UUID"

		case "uuidList":
			msg = "Must be a comma separated list of valid uuids "

		case "dive":
			msg = "Some items are invalid in the list"

		default:
			if err.Param() != "" {
				msg = fmt.Sprintf("%s: %s: %s", field, err.Tag(), err.Param())
			} else {
				msg = fmt.Sprintf("%s: %s", field, err.Tag())
			}
		}

		fieldErrors = append(fieldErrors, errs.FieldError{
			Field: strings.ToLower(err.Field()),
			Error: msg,
		})

	}

	return "Validation Failed", fieldErrors
}

var uuidRegex = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func IsValidUUID(uuid string) bool {
	return uuidRegex.MatchString(uuid)
}
