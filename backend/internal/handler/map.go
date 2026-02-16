package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
)

type MapHandler struct {
	Handler
	client *http.Client
}

func NewMapHandler(s *server.Server) *MapHandler {
	return &MapHandler{
		Handler: NewHandler(s),
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// SearchLocation proxies search requests to Nominatim
func (h *MapHandler) SearchLocation(c echo.Context) error {
	query := c.QueryParam("q")
	if query == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Query parameter 'q' is required")
	}

	// Build Nominatim URL
	apiURL := "https://nominatim.openstreetmap.org/search"
	params := url.Values{}
	params.Add("q", query)
	params.Add("format", "json")
	params.Add("addressdetails", "1")
	params.Add("limit", "5")
	params.Add("countrycodes", "in") // Restrict to India as per requirement

	// Create request
	req, err := http.NewRequest("GET", apiURL+"?"+params.Encode(), nil)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create request")
	}

	// Set required User-Agent
	req.Header.Set("User-Agent", "RapidRide/1.0")

	// Execute request
	resp, err := h.client.Do(req)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadGateway, "Failed to contact map service")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return echo.NewHTTPError(http.StatusBadGateway, fmt.Sprintf("Map service returned status: %d", resp.StatusCode))
	}

	// Decode response
	var results interface{}
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to decode map service response")
	}

	return c.JSON(http.StatusOK, results)
}

// ReverseGeocode proxies reverse geocoding requests to Nominatim
func (h *MapHandler) ReverseGeocode(c echo.Context) error {
	lat := c.QueryParam("lat")
	lon := c.QueryParam("lon")

	if lat == "" || lon == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Latitude 'lat' and longitude 'lon' are required")
	}

	// Build Nominatim URL
	apiURL := "https://nominatim.openstreetmap.org/reverse"
	params := url.Values{}
	params.Add("lat", lat)
	params.Add("lon", lon)
	params.Add("format", "json")

	// Create request
	req, err := http.NewRequest("GET", apiURL+"?"+params.Encode(), nil)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create request")
	}

	// Set required User-Agent
	req.Header.Set("User-Agent", "RapidRide/1.0")

	// Execute request
	resp, err := h.client.Do(req)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadGateway, "Failed to contact map service")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return echo.NewHTTPError(http.StatusBadGateway, fmt.Sprintf("Map service returned status: %d", resp.StatusCode))
	}

	// Decode response
	var result interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to decode map service response")
	}

	return c.JSON(http.StatusOK, result)
}

// GetRoute proxies routing requests to OSRM
func (h *MapHandler) GetRoute(c echo.Context) error {
	startLat := c.QueryParam("start_lat")
	startLon := c.QueryParam("start_lon")
	endLat := c.QueryParam("end_lat")
	endLon := c.QueryParam("end_lon")

	if startLat == "" || startLon == "" || endLat == "" || endLon == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "Start and End coordinates are required")
	}

	// Build OSRM URL
	// Format: /route/v1/driving/{longitude},{latitude};{longitude},{latitude}
	apiURL := fmt.Sprintf("http://router.project-osrm.org/route/v1/driving/%s,%s;%s,%s", startLon, startLat, endLon, endLat)

	params := url.Values{}
	params.Add("overview", "full")
	params.Add("geometries", "polyline")

	// Create request
	req, err := http.NewRequest("GET", apiURL+"?"+params.Encode(), nil)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to create request")
	}

	// Set User-Agent
	req.Header.Set("User-Agent", "RapidRide/1.0")

	// Execute request
	resp, err := h.client.Do(req)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadGateway, "Failed to contact routing service")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return echo.NewHTTPError(http.StatusBadGateway, fmt.Sprintf("Routing service returned status: %d", resp.StatusCode))
	}

	// Decode response
	var result interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Failed to decode routing service response")
	}

	return c.JSON(http.StatusOK, result)
}
