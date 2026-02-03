package sqlerr

import (
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/errs"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
)

// Errorcode reports the error code for a given error
// if the error is nil or is not of type *Error if reports sqlrr Other
func ErrCode(err error) Code {
	var pgerr *Error
	if errors.As(err, &pgerr) {
		return pgerr.Code
	}
	return Other
}

// ConvertPgerror coverts a pgconn.PgError to our custom Error type
func ConvertPgError(src *pgconn.PgError) *Error {
	return &Error{
		Code:           MapCode(src.Code),
		Severity:       MapSeverity(src.Severity),
		DatabaseCode:   src.Code,
		Message:        src.Message,
		SchemaName:     src.SchemaName,
		TableName:      src.TableName,
		ColumnName:     src.ColumnName,
		DataTypeName:   src.DataTypeName,
		ConstraintName: src.ConstraintName,
		driverErr:      src,
	}
}

// GenerateErrorCode creates constraint error codes from database errors
func generateErrorCode(tableName string, errType Code) string {
	if tableName == "" {
		tableName = "RECORD"

	}
	domain := strings.ToUpper(tableName)
	// Singularize the table Name
	if strings.HasPrefix(domain, "S") && len(domain) > 1 {
		domain = domain[:len(domain)-1]
	}
	action := "ERROR"
	switch errType {
	case ForeignKeyViolation:
		action = "NOT_FOUND"
	case UniqueViolation:
		action = "ALREADY_EXISTS"
	case NotNullViolation:
		action = "REQUIRED"
	case CheckViolation:
		action = "INVALID"
	}
	return fmt.Sprintf("%s_%s", domain, action)
}

// humanizeText converts snake_case to human-readable text
func humanizeText(text string) string {
	if text == "" {
		return ""
	}
	return cases.Title(language.English).String(strings.ReplaceAll(text, "_", " "))
}

// GetEntityName extracts entityname from database information with constraint rules
func getEntityName(tableName, columnName string) string {
	// First priority: column name logic (most reliable for FK relationships)
	if columnName != "" && strings.HasSuffix(strings.ToLower(columnName), "_id") {
		entity := strings.TrimSuffix(strings.ToLower(columnName), "_id")
		return humanizeText(entity)
	}
	//Second Priority : Table Name (fallback options)
	if tableName != "" {
		// Use Singular Form
		entity := tableName
		if strings.HasSuffix(entity, "s") && len(entity) > 1 {
			entity = entity[:len(entity)-1]

		}
		return humanizeText(entity)
	}
	//Default fallback
	return "record"
}

// formatUserFriendlyMessage generates a user-friendly error message
func formatUserFriendlyMessage(sqlerr *Error) string {
	entityName := getEntityName(sqlerr.TableName, sqlerr.ColumnName)

	switch sqlerr.Code {
	case ForeignKeyViolation:
		return fmt.Sprintf("The Referenced %s does not exist", entityName)

	case UniqueViolation:
		return fmt.Sprintf("A %s with this identifier already exists", entityName)
	case NotNullViolation:
		fieldName := humanizeText(sqlerr.ColumnName)
		if fieldName == "" {
			fieldName = "field"
		}
		return fmt.Sprintf("The %s is required", fieldName)

	case CheckViolation:
		fieldName := humanizeText(sqlerr.ColumnName)
		if fieldName != "" {
			return fmt.Sprintf("The %s value does not meet required conditions", fieldName)
		}
		return "One or more values do not meet required conditions"
	default:
		return "An error occurred while processing your request"
	}
}

// extractColumnForUniqueViolation gets field name from unique constraint
func extractColumnForUniqueViolation(constraintName string) string {
	if constraintName == "" {
		return ""
	}

	// Try standard naming convention first (unique_table_column)
	if strings.HasPrefix(constraintName, "unique_") {
		parts := strings.Split(constraintName, "_")
		if len(parts) >= 3 {
			return parts[len(parts)-1]
		}
	}

	// Try alternate convention (table_column_key)
	re := regexp.MustCompile(`_([^_]+)_(?:key|ukey)$`)
	matches := re.FindStringSubmatch(constraintName)
	if len(matches) > 1 {
		return matches[1]
	}

	return ""
}

// HandleError processes a database error into an appropriate application error
func HandleError(err error) error {
	// if it already a custom HTTP error ,  then return it
	var httperr *errs.HTTPError
	if errors.As(err, &httperr) {
		return err
	}

	// Handle PGX Specific error
	var pgerr *pgconn.PgError
	if errors.As(err, &pgerr) {
		sqlError := ConvertPgError(pgerr)
		// Geneate an appropriate error code and message
		errorCode := generateErrorCode(sqlError.TableName, Code(sqlError.ColumnName))
		userMessage := formatUserFriendlyMessage(sqlError)

		switch sqlError.Code {
		case ForeignKeyViolation:
			return errs.NewBadRequestError(userMessage, false, &errorCode, nil, nil)

		case UniqueViolation:
			columnName := extractColumnForUniqueViolation(sqlError.ConstraintName)
			if columnName != "" {
				userMessage = strings.ReplaceAll(userMessage, "identifier", humanizeText(columnName))
			}
			return errs.NewBadRequestError(userMessage, true, &errorCode, nil, nil)

		case NotNullViolation:
			fieldErrors := []errs.FieldError{
				{
					Field: strings.ToLower(sqlError.ColumnName),
					Error: "is required",
				},
			}
			return errs.NewBadRequestError(userMessage, true, &errorCode, fieldErrors, nil)

		case CheckViolation:
			return errs.NewBadRequestError(userMessage, true, &errorCode, nil, nil)

		default:
			return errs.NewInternalServerError()

		}

	}

	// Handle commonpdx errors
	switch {
	case errors.Is(err, pgx.ErrNoRows), errors.Is(err, sql.ErrNoRows):
		errMsg := err.Error()
		tablePrefix := "table:"
		if strings.Contains(errMsg, tablePrefix) {
			table := strings.Split(strings.Split(errMsg, tablePrefix)[1], ":")[0]
			entityName := getEntityName(table, "")
			return errs.NewNotFoundError(fmt.Sprintf("%s not found",
				entityName), true, nil)
		}
		return errs.NewNotFoundError("Resource not found", false, nil)
	}
	return errs.NewInternalServerError()
}
