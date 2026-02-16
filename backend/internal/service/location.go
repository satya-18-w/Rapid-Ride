package service

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/errs"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/model"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/repository"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
)

const (
	// Redis key prefix for driver locations
	driverGeoKey       = "drivers:geo"
	driverOnlinePrefix = "driver:online:"
	driverOnlineTTL    = 30 * time.Second
	// TTL for driver location in Redis (10 seconds)
	driverLocationTTL = 10 * time.Second
	// Default radius for nearby driver search (5 km)
	defaultSearchRadiusKm = 5.0
	// Default limit for nearby drivers
	defaultNearbyDriverLimit = 20
)


type LocationService struct {
	server *server.Server
	repo   *repository.Repositories
}

func NewLocationService(s *server.Server, repo *repository.Repositories) *LocationService {
	return &LocationService{
		server: s,
		repo:   repo,
	}
}

// UpdateDriverLocation updates a driver's location in Redis and periodically in PostgreSQL
func (s *LocationService) UpdateDriverLocation(ctx context.Context, update *model.LocationUpdate) error {
	// Store in Redis for fast access
	// _ ,err := ctx , err := context.WithTimeout(ctx,5*time.Second)
	_, err := s.server.Redis.GeoAdd(ctx, driverGeoKey, &redis.GeoLocation{
		Name:      update.DriverID,
		Longitude: update.Location.Longitude,
		Latitude:  update.Location.Latitude,
	}).Result()
	if err != nil {
		return errs.Wrap(err, "failed to update location in redis")
	}

	// Set online TTL Key
	onlineKey := driverOnlinePrefix + update.DriverID
	if err := s.server.Redis.Set(ctx, onlineKey, "1", driverOnlineTTL).Err(); err != nil {
		return errs.Wrap(err, "failed to set driver online status in redis")
	}

	s.server.Logger.Debug().
		Str("driver_id", update.DriverID).
		Float64("lat", update.Location.Latitude).
		Float64("lng", update.Location.Longitude).
		Msg("Driver location updated")

	return nil
}

func (s *LocationService) GetDriverlocation(ctx context.Context, driverId string) (*model.Location, error) {
	// Check if the the driver is online or not
	onlineKey := driverOnlinePrefix + driverId
	exists, err := s.server.Redis.Get(ctx, onlineKey).Result()
	if err != nil {
		return nil, errs.Wrap(err, "failed to get driver online status from redis")
	}
	if exists == "" {
		return nil, fmt.Errorf("driver is offline")
	}

	// Get Geo Location from Redis
	geopos, err := s.server.Redis.GeoPos(ctx, driverGeoKey, driverId).Result()
	if err != nil {
		return nil, errs.Wrap(err, "failed to get driver location from redis")
	}
	if len(geopos) == 0 || geopos[0] == nil {
		return nil, errs.Wrap(err, "driver location not found in redis")
	}

	location := &model.Location{
		Latitude:  geopos[0].Latitude,
		Longitude: geopos[0].Longitude,
	}
	return location, nil
}

func (s *LocationService) FindNearbyDrivers(ctx context.Context, req *model.NearbyDriversRequest) (*[]model.NearByDriversResponseFromRedis, error) {
	rediusKm := req.RadiusKm
	if rediusKm == 0 {
		rediusKm = defaultSearchRadiusKm
	}

	limit := req.Limit
	if limit == 0 {
		limit = defaultNearbyDriverLimit
	}

	result, err := s.server.Redis.GeoRadius(ctx,
		driverGeoKey,
		req.Location.Longitude,
		req.Location.Latitude,
		&redis.GeoRadiusQuery{
			Radius: rediusKm,
			Unit:   "km",
			Count:  limit,
			Sort:   "ASC",
			WithDist:  true,
			WithCoord: true,

		},
	).Result()
	if err != nil {
		return nil, errs.Wrap(err, "failed to find nearby drivers in redis")
	}

	response := make([]model.NearByDriversResponseFromRedis, 0, len(result))

	for  _,loc := range result{
		driver := model.NearByDriversResponseFromRedis{
			ID: loc.Name,
			Distance: loc.Dist,
			Latitude: loc.Latitude,
			Longitude: loc.Longitude,


		}
		response = append(response, driver)
	}

	return &response, nil
}

// SetDriverAvailability sets the availability status of a driver
func (s *LocationService) SetDriverAvailability(ctx context.Context, driverID string, available bool) error {
	onlineKey := driverOnlinePrefix + driverID
	
	if available {
		// Set driver as online
		if err := s.server.Redis.Set(ctx, onlineKey, "1", driverOnlineTTL).Err(); err != nil {
			return errs.Wrap(err, "failed to set driver availability in redis")
		}
		s.server.Logger.Debug().
			Str("driver_id", driverID).
			Bool("available", available).
			Msg("Driver availability updated to online")
	} else {
		// Remove driver from online status and geo index
		if err := s.server.Redis.Del(ctx, onlineKey).Err(); err != nil {
			return errs.Wrap(err, "failed to remove driver availability in redis")
		}
		// Remove from geo index
		if err := s.server.Redis.ZRem(ctx, driverGeoKey, driverID).Err(); err != nil {
			return errs.Wrap(err, "failed to remove driver from geo index")
		}
		s.server.Logger.Debug().
			Str("driver_id", driverID).
			Bool("available", available).
			Msg("Driver availability updated to offline")
	}

	return nil
}
