package main

import (
	"encoding/json"
	"net/http"
	"time"
)

type ServiceHealth struct {
	Healthy      bool   `json:"healthy"`
	ResponseTime int64  `json:"response_time_ms,omitempty"`
	Error        string `json:"error,omitempty"`
}

func HealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	// Проверяем Main Service
	start := time.Now()
	resp, err := http.Get(mainService.URL + "/api/health")
	duration := time.Since(start).Milliseconds()

	mainServiceHealth := ServiceHealth{
		Healthy:      false,
		ResponseTime: duration,
	}

	if err == nil {
		defer resp.Body.Close()
		mainServiceHealth.Healthy = resp.StatusCode == http.StatusOK
	} else {
		mainServiceHealth.Error = err.Error()
	}

	// Проверяем БД
	dbHealthy := true
	if err := db.Ping(); err != nil {
		dbHealthy = false
	}

	response := map[string]interface{}{
		"success":  true,
		"status":   "healthy",
		"database": dbHealthy,
		"services": map[string]ServiceHealth{
			"main_backend": mainServiceHealth,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
