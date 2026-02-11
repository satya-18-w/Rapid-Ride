package realtime

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

var (
	newline = []byte{'\n'}
	space   = []byte{' '}
)

type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	userID string
	logger zerolog.Logger
}

var Upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func (c *Client) readPump() {
	defer func() {
		c.hub.Unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, messageBytes, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				c.logger.Error().Err(err).Msg("websocket error")
			}
			break
		}

		var msg Message
		if err := json.Unmarshal(messageBytes, &msg); err != nil {
			c.logger.Error().Err(err).Msg("failed to unmarshal message")
			continue
		}

		ctx := context.Background()

		switch MessageTypes(msg.Type) {
		case RideAccept:
			if c.hub.RideService == nil {
				continue
			}
			payload, ok := msg.Payload.(map[string]interface{})
			if !ok {
				continue
			}
			rideID, _ := payload["ride_id"].(string)
			// Driver ID is the current user ID
			if _, err := c.hub.RideService.AcceptRide(ctx, c.userID, rideID); err != nil {
				c.logger.Error().Err(err).Msg("failed to accept ride")
			}

		case RideStart:
			if c.hub.RideService == nil {
				continue
			}
			payload, ok := msg.Payload.(map[string]interface{})
			if !ok {
				continue
			}
			rideID, _ := payload["ride_id"].(string)
			if _, err := c.hub.RideService.StartRide(ctx, c.userID, rideID); err != nil {
				c.logger.Error().Err(err).Msg("failed to start ride")
			}

		case RideComplete:
			if c.hub.RideService == nil {
				continue
			}
			payload, ok := msg.Payload.(map[string]interface{})
			if !ok {
				continue
			}
			rideID, _ := payload["ride_id"].(string)
			if _, err := c.hub.RideService.CompleteRide(ctx, c.userID, rideID); err != nil {
				c.logger.Error().Err(err).Msg("failed to complete ride")
			}

		case RideCancel:
			if c.hub.RideService == nil {
				continue
			}
			payload, ok := msg.Payload.(map[string]interface{})
			if !ok {
				continue
			}
			rideID, _ := payload["ride_id"].(string)
			if err := c.hub.RideService.CancelRide(ctx, c.userID, rideID); err != nil {
				c.logger.Error().Err(err).Msg("failed to cancel ride")
			}

		case DriverLocationUpdate:
			if c.hub.LocationService == nil {
				continue
			}
			payloadBytes, _ := json.Marshal(msg.Payload)
			var locationUpdate model.LocationUpdate
			if err := json.Unmarshal(payloadBytes, &locationUpdate); err != nil {
				c.logger.Error().Err(err).Msg("failed to unmarshal location update")
				continue
			}

			// Enforce security: DriverID must match authenticated user
			locationUpdate.DriverID = c.userID

			if err := c.hub.LocationService.UpdateDriverLocation(ctx, &locationUpdate); err != nil {
				// Log sampling could be good here to avoid spam
				c.logger.Error().Err(err).Msg("failed to update driver location")
			}
		}
	}
}
