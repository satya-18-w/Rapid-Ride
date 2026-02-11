package realtime

import (
	"context"
	"encoding/json"
	"sync"

	"github.com/rs/zerolog"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
)

type Message struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
	Target  string      `json:"target,omitempty"`
}

type MessageTypes string

const (
	RideAccept           MessageTypes = "accept_ride"
	RideStart            MessageTypes = "start_ride"
	RideComplete         MessageTypes = "complete_ride"
	RideCancel           MessageTypes = "cancel_ride"
	DriverLocationUpdate MessageTypes = "driver_location_update"
)

type RideService interface {
	AcceptRide(ctx context.Context, driverID, rideID string) (*model.RideResponse, error)
	StartRide(ctx context.Context, driverID, rideID string) (*model.RideResponse, error)
	CompleteRide(ctx context.Context, driverID, rideID string) (*model.RideResponse, error)
	CancelRide(ctx context.Context, userID, rideID string) error
}

type LocationService interface {
	UpdateDriverLocation(ctx context.Context, update *model.LocationUpdate) error
}

type Hub struct {
	RideService     RideService
	LocationService LocationService
	Logger          *zerolog.Logger
	Broadcast       chan []byte
	Register        chan *Client
	Unregister      chan *Client
	Clients         map[*Client]bool
	UserClients     map[string][]*Client
	mu              sync.RWMutex
}

func NewHub(logger *zerolog.Logger) *Hub {
	return &Hub{
		Logger:      logger,
		Broadcast:   make(chan []byte),
		Register:    make(chan *Client),
		Unregister:  make(chan *Client),
		Clients:     make(map[*Client]bool),
		UserClients: make(map[string][]*Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.Clients[client] = true
			if client.userID != "" {
				h.UserClients[client.userID] = append(h.UserClients[client.userID], client)
			}
			h.mu.Unlock()
			h.Logger.Info().Msg("Client registered")

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client.send)
			}
			if client.userID != "" {
				clients := h.UserClients[client.userID]
				for i, c := range clients {
					if c == client {
						h.UserClients[client.userID] = append(clients[:i], clients[i+1:]...)
						break
					}
				}
			}
			h.mu.Unlock()
			h.Logger.Info().Msg("Client unregistered")

		case message := <-h.Broadcast:
			h.mu.Lock()
			for client := range h.Clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.Clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

func (h *Hub) BroadcastToUser(userID string, msgType string, payload interface{}) {
	message := Message{
		Type:    msgType,
		Payload: payload,
	}

	bytes, err := json.Marshal(message)
	if err != nil {
		h.Logger.Err(err).Msg("Failed to Marshal Websocket Message")
		return
	}

	h.mu.RLock()
	clients := h.UserClients[userID]
	h.mu.RUnlock()

	for _, client := range clients {
		select {
		case client.send <- bytes:
		default:
		}
	}
}
