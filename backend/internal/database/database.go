package database

import (
	"context"
	"fmt"
	"net"
	"net/url"
	"strconv"
	"time"

	pgxzerolog "github.com/jackc/pgx-zerolog"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/tracelog"
	"github.com/newrelic/go-agent/v3/integrations/nrpgx5"
	"github.com/rs/zerolog"
	"github.com/satya-18-w/RAPID-RIDE/backend/internal/config"
	loggerConfig "github.com/satya-18-w/RAPID-RIDE/backend/internal/logger"
)

// MultiTracer allows chaining multiple tracers
type multiTracer struct {
	tracers []any
}

// Trace queryStart implements pgx tracer tracer interface
func (m *multiTracer) TraceQueryStart(ctx context.Context, conn *pgx.Conn, data pgx.TraceQueryStartData) context.Context {
	for _, tracer := range m.tracers {
		if t, ok := tracer.(interface {
			TraceQueryStart(context.Context, *pgx.Conn, pgx.TraceQueryStartData) context.Context
		}); ok {
			ctx = t.TraceQueryStart(ctx, conn, data)
		}
	}
	return ctx
}

func (m *multiTracer) TraceQueryEnd(ctx context.Context, conn *pgx.Conn, data pgx.TraceQueryEndData) {
	for _, tracer := range m.tracers {
		if t, ok := tracer.(interface {
			TraceQueryEnd(context.Context, *pgx.Conn, pgx.TraceQueryEndData)
		}); ok {
			t.TraceQueryEnd(ctx, conn, data)
		}
	}
}

const (
	DatabasePingTimeout = 10
)

// Pooling  which will be used across the application.
type Database struct {
	Pool *pgxpool.Pool
	log  *zerolog.Logger
}

func New(cfg *config.Config, logger *zerolog.Logger, loggerservice *loggerConfig.LoggerService) (*Database, error) {
	hostport := net.JoinHostPort(cfg.Database.Host, strconv.Itoa(cfg.Database.Port))
	// Url encod the password

	encodedPassword := url.QueryEscape(cfg.Database.Password)
	dsn := fmt.Sprintf("postgres://%s:%s@%s/%s?sslmode=%s",
		cfg.Database.User,
		encodedPassword,
		hostport,
		cfg.Database.Name,
		cfg.Database.SSLMode,
	)
	pgxPoolConfig, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("could not parse db config : %w", err)
	}

	// Add New Relic PostfressSql instrumentation
	if loggerservice != nil && loggerservice.GetApplication() != nil {
		pgxPoolConfig.ConnConfig.Tracer = nrpgx5.NewTracer()
	}
	if cfg.Primary.Env == "local" {
		globallevel := logger.GetLevel()
		pgxLogger := loggerConfig.NewPgxLogger(globallevel)
		// chain tracers - new Relic first then local logging
		if pgxPoolConfig.ConnConfig.Tracer != nil {
			// if newrelic tracer exists then create a multitracer
			localTracer := &tracelog.TraceLog{
				Logger:   pgxzerolog.NewLogger(pgxLogger),
				LogLevel: tracelog.LogLevel(loggerConfig.GetPgxTraceLogLevel(globallevel)),
			}
			pgxPoolConfig.ConnConfig.Tracer = &multiTracer{
				tracers: []any{pgxPoolConfig.ConnConfig.Tracer, localTracer},
			}

		} else {
			pgxPoolConfig.ConnConfig.Tracer = &tracelog.TraceLog{
				Logger:   pgxzerolog.NewLogger(pgxLogger),
				LogLevel: tracelog.LogLevel(loggerConfig.GetPgxTraceLogLevel(globallevel)),
			}
		}
	}
	pool, err := pgxpool.NewWithConfig(context.Background(), pgxPoolConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create pgx pool: %w", err)
	}
	database := &Database{
		Pool: pool,
		log:  logger,
	}
	ctx, cancel := context.WithTimeout(context.Background(), DatabasePingTimeout*time.Second)
	defer cancel()
	if err = pool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}
	logger.Info().Msg(("Connected to the Database Successfully"))
	return database, nil

}

func (db *Database) Close() error {
	db.log.Info().Msg("Closing Database Connection pool")
	db.Pool.Close()
	return nil

}
