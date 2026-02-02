package server

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/newrelic/go-agent/v3/integrations/nrredis-v9"

	"github.com/rs/zerolog"
	"github.com/redis/go-redis/v9"
	"github.com/satya-18-w/go-boilerplate/internal/config"
	"github.com/satya-18-w/go-boilerplate/internal/database"
	"github.com/satya-18-w/go-boilerplate/internal/lib/job"
	loggerpkg "github.com/satya-18-w/go-boilerplate/internal/logger"
)

type Server struct {
	Config        *config.Config
	Logger        *zerolog.Logger
	LoggerService *loggerpkg.LoggerService
	DB            *database.Database
	Redis         *redis.Client
	httpServer    *http.Server
	Job           *job.JobService
}

func New(cfg *config.Config, logger *zerolog.Logger, loggerservice *loggerpkg.LoggerService) (*Server, error) {
	db, err := database.New(cfg, logger, loggerservice)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	// Redis Client with New Relic Integration
	redisclient := redis.NewClient(&redis.Options{
		Addr: cfg.Redis.Address,
	})

	// Add New Relic redis hooks if avaliable
	if loggerservice != nil && loggerservice.GetApplication() != nil {
		redisclient.AddHook(nrredis.NewHook(redisclient.Options()))
	}

	// Test Redis Connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	if err := redisclient.Ping(ctx).Err(); err != nil {
		logger.Error().Err(err).Msg("Failed to Connect to Redis , Continuing without redis")
	}

	defer cancel()

	// Job Service
	jobservice := job.NewJobService(logger, cfg)
	jobservice.InitHandlers(cfg, logger)

	// Start job server
	if err := jobservice.Start(); err != nil {
		return nil, err
	}
	server := &Server{
		Config:        cfg,
		Logger:        logger,
		LoggerService: loggerservice,
		DB:            db,
		Redis:         redisclient,
		Job:           jobservice,
	}

	// Start metrics collection
	// Runtime metrics are automatically collected by New Relic Go agent

	return server, nil

}

func (s *Server) SetupHTTPServer(handler http.Handler) {
	s.httpServer = &http.Server{

		Addr:         ":" + s.Config.Server.Port,
		Handler:      handler,
		ReadTimeout:  time.Duration(s.Config.Server.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(s.Config.Server.WriteTimeout) * time.Second,
		IdleTimeout:  time.Duration(s.Config.Server.IdleTimeout),
	}

}

func (s *Server) Start() error {
	if s.httpServer == nil {
		return errors.New("Http Server not initialized")

	}
	s.Logger.Info().Str("port", s.Config.Server.Port).Str("env", s.Config.Primary.Env).Msg("Starting Server")
	return s.httpServer.ListenAndServe()
}

// Gracefull Shutdown
func (s *Server) Shutdown(ctx context.Context) error {
	if err := s.httpServer.Shutdown(ctx); err != nil {
		return fmt.Errorf("failed to shutdown HTTP server: %w", err)
	}

	if err := s.DB.Close(); err != nil {
		return fmt.Errorf("failed to close database connection: %w", err)
	}

	if s.Job != nil {
		s.Job.Stop()
	}

	return nil
}
