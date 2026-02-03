package config

import (
	"os"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/go-viper/mapstructure/v2"
	_ "github.com/joho/godotenv/autoload"
	"github.com/knadh/koanf/providers/env"

	"github.com/knadh/koanf/v2"
	"github.com/rs/zerolog"
)

// Store all the go struct env variables.
type Config struct {
	Primary       Primary              `koanf:"primary" validate:"required"`
	Server        ServerConfig         `koanf:"server" validate:"required"`
	Database      DatabaseConfig       `koanf:"database" validate:"required"`
	Auth          AuthConfig           `koanf:"auth" validate:"required"`
	Redis         RedisConfig          `koanf:"redis" validate:"required"`
	Observability *ObservabilityConfig `koanf:"observability"`
	Integration   IntegrationConfig    `koanf:"integration" validate:"required"`
}

type Primary struct {
	Env string `koanf:"env" validate:"required"`
}

type IntegrationConfig struct {
	ResendAPIKey string `koanf:"resend_api_key" validate:"required"`
}

type ServerConfig struct {
	Port             string   `koanf:"port" validate:"required"`
	ReadTimeout      int      `koanf:"read_timeout" validate:"required"`
	WriteTimeout     int      `koanf:"write_timeout" validate:"required"`
	IdleTimeout      int      `koanf:"idle_timeout" validate:"required"`
	CORSAllowOrigins []string `koanf:"cors_allowed_origins" validate:"required"`
}

type DatabaseConfig struct {
	Host            string `koanf:"host" validate:"required"`
	Port            int    `koanf:"port" validate:"required"`
	User            string `koanf:"user" validate:"required"`
	Password        string `koanf:"password" validate:"required"`
	Name            string `koanf:"name" validate:"required"`
	SSLMode         string `koanf:"ssl_mode" validate:"required"`
	MaxOpenConns    int    `koanf:"max_open_conns" validate:"required"`
	MaxIdleConns    int    `koanf:"max_idle_conns" validate:"required"`
	ConnMaxLifetime int    `koanf:"conn_max_lifetime" validate:"required"`
	ConnMaxIdleTime int    `koanf:"conn_max_idle_time" validate:"required"`
}

type RedisConfig struct {
	Address string `koanf:"address" validate:"required"`
}

type AuthConfig struct {
	SecretKey string `koanf:"secret_key" validate:"required"`
}

func LoadConfig() (*Config, error) {
	logger := zerolog.New(zerolog.ConsoleWriter{Out: os.Stderr}).With().Timestamp().Logger()
	k := koanf.New(".")
	err := k.Load(env.Provider("RAPID_RIDE_", ".", func(s string) string {
		s = strings.ToLower(strings.TrimPrefix(s, "RAPID_RIDE_"))

		// Handle specific nested structs with underscores in their koanf tags
		replacements := map[string]string{
			"observability_new_relic_":     "observability.new_relic.",
			"observability_health_checks_": "observability.health_checks.",
			"observability_logging_":       "observability.logging.",
		}

		for prefix, replacement := range replacements {
			if strings.HasPrefix(s, prefix) {
				return strings.Replace(s, prefix, replacement, 1)
			}
		}

		// Map known top-level prefixes to dot notation
		prefixes := []string{"primary", "server", "database", "auth", "redis", "observability", "integration"}
		for _, p := range prefixes {
			if strings.HasPrefix(s, p+"_") {
				return strings.Replace(s, "_", ".", 1)
			}
		}
		return s
	}), nil)
	if err != nil {
		logger.Fatal().Err(err).Msg("Could not load initial env variables")
	}

	// Debug: Print loaded config
	logger.Debug().Interface("keys", k.Keys()).Msg("Loaded config keys")

	// Initialize with defaults
	mainconfig := &Config{
		Observability: DefaultObservabilityConfig(),
	}

	// Use UnmarshalWithConf to support time.Duration and slice parsing
	err = k.UnmarshalWithConf("", mainconfig, koanf.UnmarshalConf{
		DecoderConfig: &mapstructure.DecoderConfig{
			DecodeHook: mapstructure.ComposeDecodeHookFunc(
				mapstructure.StringToTimeDurationHookFunc(),
				mapstructure.StringToSliceHookFunc(","),
			),
			Metadata:         nil,
			Result:           mainconfig,
			WeaklyTypedInput: true,
		},
	})
	if err != nil {
		logger.Fatal().Err(err).Msg("Could not unmarshal main config")
	}

	// Re-apply environment (overrides defaults if env var matches)
	mainconfig.Observability.Environment = mainconfig.Primary.Env

	validate := validator.New()
	err = validate.Struct(mainconfig)
	if err != nil {
		logger.Fatal().Err(err).Msg("Config validation Failed")
	}
	// ServiceName handling if needed, though default covers it

	if err := mainconfig.Observability.Validate(); err != nil {
		logger.Fatal().Err(err).Msg("Observability config validation failed")
	}
	return mainconfig, nil

}
