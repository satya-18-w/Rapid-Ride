package email

import (
	"bytes"
	"fmt"
	"html/template"

	"github.com/pkg/errors"
	"github.com/resend/resend-go/v2"
	"github.com/rs/zerolog"
	"github.com/satya-18-w/go-boilerplate/internal/config"
)

type Client struct {
	client *resend.Client
	logger *zerolog.Logger
}

func NewClient(cfg *config.Config, logger *zerolog.Logger) *Client{
	return  &Client{
		client: resend.NewClient(cfg.Integration.ResendAPIKey),
		logger: logger,

	}
	
}


func (c *Client) SendEmail(to,subject string, templateName Template, data map[string]string) error{
	templPath:= fmt.Sprintf("%s%s.html","templates/emails",templateName)


	templ,err:= template.ParseFiles(templPath)
	if err != nil{
		return errors.Wrapf(err,"Fialed to parse email template %s",templateName)
	}

	var body bytes.Buffer
	if err := templ.Execute(&body, data); err != nil {
		return errors.Wrapf(err, "failed to execute email template %s", templateName)
	}
	

	params:= &resend.SendEmailRequest{
		From: fmt.Sprintf("%s <%s>","Boilerplate","satyajitsamal198076@gmail.com"),
		To: []string{to},
		Subject: subject,
		Html: body.String(),

	}

	_,err = c.client.Emails.Send(params)
	
	if err != nil{
		return fmt.Errorf("failed to send email: %w", err)

	}
	return nil

}