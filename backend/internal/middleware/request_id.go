package middleware

// ✦ In Go, Echo is a high-performance, extensible, and minimalist web framework. It's designed for building robust and scalable REST APIs, web applications, and microservices quickly and easily.

//   Its main features include:

//    * Optimized Router: A highly efficient HTTP router that smartly prioritizes routes, leading to faster performance.
//    * Extensive Middleware: Comes with a large set of built-in middleware for tasks like logging, error recovery, CORS, and more. It's also simple to define your own.
//    * Data Binding: Easily bind incoming request data (like JSON, XML, or form data) into Go structs.
//    * Data Rendering: Render various response types, including JSON, XML, and HTML templates.
//    * Scalability: Its minimalist design allows you to build upon a solid foundation.
//    * Centralized Error Handling: Provides a central place to handle HTTP errors.

import (
	// "errors"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

const (
	RequestIDHeader = "X-Request-ID"
	RequestIDKey    = "request_id"
)

func RequestID() echo.MiddlewareFunc { 

	return func(next echo.HandlerFunc) echo.HandlerFunc{
		return func(c echo.Context) error{
			requestID:= c.Request().Header.Get((RequestIDHeader))
			if requestID == ""{
				// if no requestid present then create a new request ID
				requestID=uuid.New().String()
			}
			c.Set(RequestIDKey, requestID)
			c.Response().Header().Set(RequestIDHeader, requestID)

			return next(c)
		}
	}
}


func GetRequestID(c echo.Context) string {
	if requestID, ok := c.Get(RequestIDKey).(string); ok {
		return requestID
	}
	return ""
}