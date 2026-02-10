package handlers

import (
	"admin/middleware"
	"encoding/json"
	"net/http"
)

// getGatewayClient создает клиент для работы с gateway
func getGatewayClient(r *http.Request) (*middleware.GatewayClient, error) {
	authToken, err := middleware.GetAuthTokenFromRequest(r)
	if err != nil {
		return nil, err
	}
	return middleware.NewGatewayClient(authToken), nil
}

// proxyGatewayResponse проксирует ответ от gateway
func proxyGatewayResponse(w http.ResponseWriter, data []byte, err error) {
	if err != nil {
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

// parseJSONBody парсит JSON из тела запроса
func parseJSONBody(r *http.Request, v interface{}) error {
	return json.NewDecoder(r.Body).Decode(v)
}

// parseJSON парсит JSON из байтов
func parseJSON(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}
