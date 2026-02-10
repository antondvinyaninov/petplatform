package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// GatewayClient клиент для работы с gateway API
type GatewayClient struct {
	BaseURL   string
	AuthToken string
}

// NewGatewayClient создает новый клиент
func NewGatewayClient(authToken string) *GatewayClient {
	return &GatewayClient{
		BaseURL:   gatewayURL,
		AuthToken: authToken,
	}
}

// Get выполняет GET запрос к gateway
func (c *GatewayClient) Get(endpoint string) ([]byte, error) {
	req, err := http.NewRequest("GET", c.BaseURL+endpoint, nil)
	if err != nil {
		return nil, err
	}

	req.AddCookie(&http.Cookie{
		Name:  "auth_token",
		Value: c.AuthToken,
	})

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("gateway error: %d - %s", resp.StatusCode, string(body))
	}

	return body, nil
}

// Post выполняет POST запрос к gateway
func (c *GatewayClient) Post(endpoint string, data interface{}) ([]byte, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", c.BaseURL+endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{
		Name:  "auth_token",
		Value: c.AuthToken,
	})

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("gateway error: %d - %s", resp.StatusCode, string(body))
	}

	return body, nil
}

// Put выполняет PUT запрос к gateway
func (c *GatewayClient) Put(endpoint string, data interface{}) ([]byte, error) {
	jsonData, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("PUT", c.BaseURL+endpoint, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{
		Name:  "auth_token",
		Value: c.AuthToken,
	})

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("gateway error: %d - %s", resp.StatusCode, string(body))
	}

	return body, nil
}

// Delete выполняет DELETE запрос к gateway
func (c *GatewayClient) Delete(endpoint string) ([]byte, error) {
	req, err := http.NewRequest("DELETE", c.BaseURL+endpoint, nil)
	if err != nil {
		return nil, err
	}

	req.AddCookie(&http.Cookie{
		Name:  "auth_token",
		Value: c.AuthToken,
	})

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("gateway error: %d - %s", resp.StatusCode, string(body))
	}

	return body, nil
}

// GetAuthTokenFromRequest извлекает auth_token из запроса
func GetAuthTokenFromRequest(r *http.Request) (string, error) {
	cookie, err := r.Cookie("auth_token")
	if err != nil {
		return "", fmt.Errorf("auth_token cookie not found")
	}
	return cookie.Value, nil
}

// GetBaseURL возвращает базовый URL gateway
func (c *GatewayClient) GetBaseURL() string {
	return c.BaseURL
}
