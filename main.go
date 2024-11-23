package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

const API_KEY = "AinNjWaw0V5CGZPf3XxFPtWxcHWfDCr7W82rfNQMeLdw"

type CreatePaymentRequest struct {
	Coin        string            `json:"coin" binding:"required"`
	OwnAddress  string            `json:"own_address" binding:"required"`
	CallbackURL string            `json:"callback_url" binding:"required"`
	Parameters  map[string]string `json:"parameters"`
}

type GenerateQRCodeRequest struct {
	Coin        string  `json:"coin" binding:"required"`
	OwnAddress  string  `json:"own_address" binding:"required"`
	CallbackURL string  `json:"callback_url" binding:"required"`
	Value       float64 `json:"value"`
	Size        int     `json:"size"`
}

type PaymentCallback struct {
	Address  string  `json:"address"`
	Amount   float64 `json:"amount"`
	Currency string  `json:"currency"`
	Status   string  `json:"status"`
}

func createPayment(c *gin.Context) {
	var req CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	url := fmt.Sprintf("https://api.blockbee.io/%s/create/", req.Coin)
	params := map[string]string{
		"apikey":   API_KEY,
		"address":  req.OwnAddress,
		"callback": req.CallbackURL,
	}

	for key, value := range req.Parameters {
		params[key] = value
	}

	resp, err := http.Get(buildURLWithParams(url, params))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to call BlockBee API"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		c.JSON(resp.StatusCode, gin.H{"error": string(body)})
		return
	}

	var responseData map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&responseData)

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"address": responseData["address_in"],
		"coin":    req.Coin,
	})
}

func generateQRCode(c *gin.Context) {
	var req GenerateQRCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	url := fmt.Sprintf("https://api.blockbee.io/%s/qrcode/", req.Coin)
	params := map[string]string{
		"apikey":  API_KEY,
		"address": req.OwnAddress,
		"value":   fmt.Sprintf("%.2f", req.Value),
		"size":    fmt.Sprintf("%d", req.Size),
	}

	resp, err := http.Get(buildURLWithParams(url, params))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to call BlockBee API"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := ioutil.ReadAll(resp.Body)
		c.JSON(resp.StatusCode, gin.H{"error": string(body)})
		return
	}

	var responseData map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&responseData)

	c.JSON(http.StatusOK, gin.H{
		"status":      "success",
		"qr_code":     responseData["qr_code"],
		"payment_uri": responseData["payment_uri"],
	})
}

func paymentCallback(c *gin.Context) {
	var callback PaymentCallback
	if err := c.ShouldBindJSON(&callback); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if callback.Status == "confirmed" {
		log.Printf("Payment confirmed: %.2f %s to address %s\n", callback.Amount, callback.Currency, callback.Address)
	} else {
		log.Printf("Payment status: %s\n", callback.Status)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Callback handled successfully",
	})
}

func buildURLWithParams(baseURL string, params map[string]string) string {
	query := "?"
	for key, value := range params {
		query += fmt.Sprintf("%s=%s&", key, value)
	}
	return baseURL + query[:len(query)-1]
}

func main() {
	r := gin.Default()

	r.POST("/create-payment", createPayment)
	r.POST("/generate-qrcode", generateQRCode)
	r.POST("/payment-callback", paymentCallback)

	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to run server: %s", err)
	}
}
