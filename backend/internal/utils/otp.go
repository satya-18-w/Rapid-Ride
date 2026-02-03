package utils

import (
	"crypto/rand"
	"math/big"
)

// GenerateOTP generates a 4-digit OTP
func GenerateOTP() (string, error) {
	// Generate a random number between 1000 and 9999
	n, err := rand.Int(rand.Reader, big.NewInt(9000))
	if err != nil {
		return "", err
	}
	
	otp := n.Int64() + 1000
	return string([]byte{
		byte('0' + (otp/1000)%10),
		byte('0' + (otp/100)%10),
		byte('0' + (otp/10)%10),
		byte('0' + otp%10),
	}), nil
}
