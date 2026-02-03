package email

func (c *Client) SendWelcomeEmail(to, firstName string) error {
	data := map[string]string{
		"UserFirstName": firstName,
	}

	return c.SendEmail(to, "Welcome to Boilerplate!", TemplateWelcome, data)

}

func (c *Client) SendOTPEmail(to, otp string) error {
	data := map[string]string{
		"OTP": otp,
	}

	return c.SendEmail(to, "Your Rapid-Ride Login OTP", TemplateOTP, data)
}
