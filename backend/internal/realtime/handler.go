package realtime

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// HandleWebSocket handles websocket requests from the peer.
func Handler(hub *Hub) echo.HandlerFunc {
	return func(c echo.Context) error {
		userID := c.Get("user_id")
		uid, ok := userID.(string)
		if !ok || uid == "" {
			// Try query param if context missing (initial connection might be weird with auth middleware?)
			// Assuming Auth middleware runs before
			return echo.NewHTTPError(http.StatusUnauthorized, "missing user_id")
		}

		conn, err := Upgrader.Upgrade(c.Response(), c.Request(), nil)
		if err != nil {
			hub.Logger.Error().Err(err).Msg("Failed to upgrade websocket")
			return err
		}

		client := &Client{
			hub:    hub,
			conn:   conn,
			send:   make(chan []byte, 256),
			userID: uid,
			logger: hub.Logger.With().Str("component", "websocket_client").Logger(),
		}
		client.hub.register <- client

		// Allow collection of memory referenced by the caller by doing all work in
		// new goroutines.
		go client.writePump()
		go client.readPump()

		return nil
	}
}
