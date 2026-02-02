package handler

import (
	"time"

	"github.com/labstack/echo/v4"
	"github.com/newrelic/go-agent/v3/integrations/nrpkgerrors"
	"github.com/newrelic/go-agent/v3/newrelic"
	"github.com/satya-18-w/go-boilerplate/internal/middleware"
	"github.com/satya-18-w/go-boilerplate/internal/server"
	"github.com/satya-18-w/go-boilerplate/internal/validation"
)

// Handler Provides base functionality for all Handlers

type Handler struct {
	server *server.Server
}

// newhandler creates a new base handler
func NewHandler(s *server.Server) Handler {

	return Handler{
		server: s,
	}
}

//  we are defining the signature of the handler function used in our application

// Handlerfunc represent a typed handler function that processes a request and returns a response
type HandlerFunc[Req validation.Validatable, Res any] func(c echo.Context, req Req) (Res, error)

// Handler funcNoContent a typed handler function that processes a request without return context
type HandlerFuncNoContent[Req validation.Validatable] func(c echo.Context, req Req) error

// ResponseHandler defines the interface for handling different types
type ResponseHandler interface {
	Handle(c echo.Context, result interface{}) error
	GetOperation() string
	AddAttributes(txn *newrelic.Transaction, result interface{})
}

// JSONResponseHandler handles JSON Response
type JsonResponseHandler struct {
	status int
}

func (h JsonResponseHandler) Handle(c echo.Context, result interface{}) error {
	return c.JSON(h.status, result)
}

func (h JsonResponseHandler) GetOperation() string {
	return "handler"
}

func (h JsonResponseHandler) AddAttributes(txn *newrelic.Transaction, result interface{}) {
	// Http.status_code is already set by the tracing middleware
}

// No content reponse handler
type NoContentResponseHandler struct {
	status int
}

func (h NoContentResponseHandler) Handle(c echo.Context, result interface{}) error {
	return c.NoContent(h.status)
}

func (h NoContentResponseHandler) GetOperation() string {
	return "handler_no_content"
}

func (h NoContentResponseHandler) AddAttributes(txn *newrelic.Transaction, result interface{}) {
	// http.status_code is already set by tracing middleware
}

type FileResponseHandler struct {
	status      int
	filename    string
	contentType string
}

func (h FileResponseHandler) Handle(c echo.Context, result interface{}) error {

	// Data type conversion
	data := result.([]byte)
	c.Response().Header().Set("Content-Disposition", "attachment; filename="+h.filename)
	return c.Blob(h.status, h.contentType, data)

}

func (h FileResponseHandler) GetOperation() string {
	return "handler_file_response"
}

func (h FileResponseHandler) AddAttributes(txn *newrelic.Transaction, result interface{}) {
	if txn != nil {
		// http.status_code is already set by tracing middleware
		txn.AddAttribute("file.name", h.filename)
		txn.AddAttribute("file.content_type", h.contentType)
		if data, ok := result.([]byte); ok {
			txn.AddAttribute("file.Size_bytes", len(data))
		}

	}
}

// HandleRequest in the undefined handler function that eliminates code duplication

func HandleRequest[Req validation.Validatable](c echo.Context, req Req, handler func(c echo.Context, req Req) (interface{}, error), responseHandler ResponseHandler) error {
	start := time.Now()
	method := c.Request().Method
	path := c.Path()
	route := path
	// Gety New relic transaction from context
	txn := newrelic.FromContext(c.Request().Context())
	if txn != nil {
		txn.AddAttribute("handle.name", route)
		// http.method and http.route are alredy set by nrecho middleware
		responseHandler.AddAttributes(txn, nil)

	}

	// Get Context-enhanced Logger
	loggerBuilder := middleware.GetLogger(c).With().Str("operation", responseHandler.GetOperation()).
		Str("method", method).
		Str("route", route).
		Str("Path", path)

	// Add fil-specific field to the logger if it is a fileHandler
	if fileHandler, ok := responseHandler.(FileResponseHandler); ok {
		loggerBuilder = loggerBuilder.Str("filename", fileHandler.filename).
			Str("Content-Type", fileHandler.contentType)

	}
	// tHIS LOGGERbUILDER.lOGGER gives the actual logger instance which will used as logger
	logger := loggerBuilder.Logger()
	// User Id is already set by the tracing middleware
	logger.Info().Msg("Handeling the request")
	// Validation with Observability
	validationStart := time.Now()
	if err := validation.BindAndvalidate(c, req); err != nil {
		validationDuration := time.Since(validationStart)
		logger.Error().Err(err).
			Dur("validation_duration", validationDuration).
			Msg("request Validation failed")

		if txn != nil {
			txn.NoticeError(nrpkgerrors.Wrap(err))
			txn.AddAttribute("Validation_status", "Failed")

			txn.AddAttribute("Validation_Duration", validationDuration)
			txn.AddAttribute("validation.duration_ms", validationDuration.Milliseconds())

		}

		return err

	}
	validationDuration := time.Since(validationStart)
	if txn != nil {
		txn.AddAttribute("Validation_status", "success")
		txn.AddAttribute("Validation_Duration_ms", validationDuration.Milliseconds())
	}
	logger.Debug().
		Dur("Validation_duration", validationDuration).
		Msg("request Validation Succesful")

	// Execute  Handler with Observability
	handlerstart := time.Now()
	res, err := handler(c, req)
	handlerDuration := time.Since(handlerstart)
	if err != nil {
		totalDuration := time.Since(start)
		logger.Error().Err(err).
			Dur("Handler_Duration", handlerDuration).
			Dur("Total_Duration", totalDuration).
			Msg("handler execution failed")

		if txn != nil {
			txn.NoticeError(nrpkgerrors.Wrap(err))
			txn.AddAttribute("handler.duration_ms", handlerDuration.Milliseconds())
			txn.AddAttribute("total.duration_ms", totalDuration.Milliseconds())
		}

		return err
	}
	totalDuration := time.Since(start)
	// record the sucesful handling of the request
	logger.Info().Dur("handler_duration", handlerDuration).Dur("Total_Duration", totalDuration).Msg("Request_Handled_Successfully")
	if txn != nil {
		txn.AddAttribute("handler.status", "Success")
		txn.AddAttribute("handler.duration_ms", handlerDuration.Milliseconds())
		txn.AddAttribute("TotalDuration", totalDuration.Milliseconds())
	}

	return responseHandler.Handle(c, res)

}

// Handle wraps a handler with validation , error handeling, logging, metrics and tracing

func Handle[Req validation.Validatable, Res any](h Handler,
	handler HandlerFunc[Req, Res],
	status int,
	req Req) echo.HandlerFunc {
	return func(c echo.Context) error {
		return HandleRequest(c, req, func(c echo.Context, req Req) (interface{}, error) {
			return handler(c, req)
		}, JsonResponseHandler{status: status})
	}

}

func Handlefile[Req validation.Validatable](h Handler, handler HandlerFunc[Req, []byte], status int, req Req, fileName string, contentType string) echo.HandlerFunc {
	return func(c echo.Context) error {
		return HandleRequest(c, req, func(c echo.Context, req Req) (interface{}, error) {
			return handler(c, req)
		}, FileResponseHandler{
			status:      status,
			filename:    fileName,
			contentType: contentType,
		})
	}
}

// HandleNoContent wraps a handler with validation, error handling, logging, metrics, and tracing for endpoints that don't return content
func HandleNoContent[Req validation.Validatable](
	h Handler,
	handler HandlerFuncNoContent[Req],
	status int,
	req Req,
) echo.HandlerFunc {
	return func(c echo.Context) error {
		return HandleRequest(c, req, func(c echo.Context, req Req) (interface{}, error) {
			err := handler(c, req)
			return nil, err
		}, NoContentResponseHandler{status: status})
	}
}
