package job

import (
	"github.com/hibiken/asynq"
	"github.com/rs/zerolog"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/config"
)

type JobService struct {
	Client *asynq.Client
	Server *asynq.Server
	logger *zerolog.Logger
}

func NewJobService(logger *zerolog.Logger, cfg *config.Config) *JobService {
	redisAddr := cfg.Redis.Address
	client := asynq.NewClient(asynq.RedisClientOpt{
		Addr: redisAddr,
	})

	server := asynq.NewServer(
		asynq.RedisClientOpt{Addr: redisAddr},
		asynq.Config{
			Concurrency: 10,
			Queues: map[string]int{
				"critical": 6, // Higher priority queue for important emails
				"default":  3, // Default priority for most emails
				"low":      1, // Lower priority for non-urgent emails
			},
		},
	)

	return &JobService{
		Client: client,
		Server: server,
		logger: logger,
	}
}

func (j *JobService) Start() error {
	// Register task handlers
	mux := asynq.NewServeMux()

	mux.HandleFunc(TaskWelcome, j.handleWelcomeEmailTask)
	mux.HandleFunc(TaskOTP, j.handleOTPEmailTask)
	j.logger.Info().Msg("Starting Backgrond Job Server")
	if err := j.Server.Start(mux); err != nil {
		return err
	}
	return nil
}

func (j *JobService) Stop() {
	j.logger.Info().Msg("Stopping background job server")
	j.Server.Shutdown()
	j.Client.Close()
}
