package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/joho/godotenv"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/config"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/database"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/handler"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/logger"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/repository"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/router"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/server"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/service"
)

const DefaultContextTimeout = 30

func main() {

	_ = godotenv.Load()


	cfg, err := config.LoadConfig()
	if err != nil {
		panic("failed to load the config" + err.Error())

	}

	// Initialize new relic server

	loggerservice := logger.NewLoggerService(cfg.Observability)
	defer loggerservice.Shutdown()
	log := logger.NewLoggerWithService(cfg.Observability, loggerservice)

	if cfg.Primary.Env != "local" {
		if err := database.Migrate(context.Background(), log, cfg); err != nil {
			log.Fatal().Err(err).Msg("Failed to database Migrate")
		}
	}

	// Initialize server
	server, err := server.New(cfg, &log, loggerservice)
	if err != nil {
		log.Fatal().Err(err).Msg("Failed to initialize server")

	}

	// Initialize repositories , sevices and handlers

	repos := repository.NewRepositories(server)
	services, serviceErr := service.NewServices(server, repos)
	if serviceErr != nil {
		log.Fatal().Err(serviceErr).Msg("Could not create services")
	}


	server.Hub.RideService = services.Ride
	server.Hub.LocationService = services.Location

	handlers := handler.NewHandlers(server, services)


	r := router.NewRouter(server, handlers, services)


	server.SetupHTTPServer(r)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)

	// Start server
	go func() {
		if err := server.Start(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal().Err(err).Msg("failed to start server")
		}
	}()
	// wait for interupt signal to greacefully shotdown the server

	<-ctx.Done()
	ctx, cancel := context.WithTimeout(context.Background(), DefaultContextTimeout*time.Second)

	if err = server.Shutdown(ctx); err != nil {
		log.Fatal().Err(err).Msg("Server forced to shutdown!")
	}

	stop()
	cancel()
	log.Info().Msg("server exited properly")

}
