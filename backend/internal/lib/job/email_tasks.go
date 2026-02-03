package job

import (
	"encoding/json"
	"time"

	"github.com/hibiken/asynq"
)

const (
	TaskWelcome = "email:welcome"
)

type WelcomeEmailPayload struct {
	To        string `json:"to"`
	FirstName string `json:"first_name"`
}

func NewWelcomeEmailTask(to, firstName string) (*asynq.Task, error) {
	payload, err := json.Marshal(WelcomeEmailPayload{
		To:        to,
		FirstName: firstName,
	})
	if err != nil {
		return nil, err
	}

	return asynq.NewTask(TaskWelcome, payload,
		asynq.MaxRetry(3),
		asynq.Queue("default"),
		asynq.Timeout(30*time.Second)), nil
}

const (
	TaskOTP = "email:otp"
)

type OTPEmailPayload struct {
	To  string `json:"to"`
	OTP string `json:"otp"`
}

func NewOTPEmailTask(to, otp string) (*asynq.Task, error) {
	payload, err := json.Marshal(OTPEmailPayload{
		To:  to,
		OTP: otp,
	})
	if err != nil {
		return nil, err
	}

	return asynq.NewTask(TaskOTP, payload,
		asynq.MaxRetry(3),
		asynq.Queue("critical"), // OTP is critical
		asynq.Timeout(30*time.Second)), nil
}
