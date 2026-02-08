package main

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
)

func ProxyHandler(service *Service) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Формируем URL для backend
		targetPath := r.URL.Path

		// Для petbase убираем префикс /api/petbase и оставляем /api/*
		if strings.HasPrefix(targetPath, "/api/petbase/") {
			targetPath = "/api/" + strings.TrimPrefix(targetPath, "/api/petbase/")
		}

		// Для petid убираем префикс /api/petid и оставляем /api/*
		if strings.HasPrefix(targetPath, "/api/petid/") {
			targetPath = "/api/" + strings.TrimPrefix(targetPath, "/api/petid/")
		}

		targetURL := service.URL + targetPath
		if r.URL.RawQuery != "" {
			targetURL += "?" + r.URL.RawQuery
		}

		log.Printf("🔄 Proxying: %s %s → %s (Service: %s)", r.Method, r.URL.Path, targetURL, service.Name)

		// Создаем новый запрос
		proxyReq, err := http.NewRequest(r.Method, targetURL, r.Body)
		if err != nil {
			log.Printf("❌ Failed to create proxy request: %v", err)
			respondError(w, "Failed to proxy request", http.StatusInternalServerError)
			return
		}

		// Копируем заголовки
		for key, values := range r.Header {
			for _, value := range values {
				proxyReq.Header.Add(key, value)
			}
		}

		// Добавляем X-Forwarded-* заголовки
		proxyReq.Header.Set("X-Forwarded-For", r.RemoteAddr)
		proxyReq.Header.Set("X-Forwarded-Proto", "http")
		proxyReq.Header.Set("X-Forwarded-Host", r.Host)

		// Логируем заголовки для отладки
		log.Printf("🔍 Proxy headers: Authorization=%s, Cookie=%s, X-User-ID=%s",
			proxyReq.Header.Get("Authorization"),
			proxyReq.Header.Get("Cookie"),
			proxyReq.Header.Get("X-User-ID"))

		// Выполняем запрос
		client := &http.Client{
			Timeout: 30 * time.Second,
		}
		resp, err := client.Do(proxyReq)
		if err != nil {
			log.Printf("❌ Failed to proxy to %s: %v", service.Name, err)
			respondError(w, fmt.Sprintf("Service %s unavailable", service.Name), http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		// Копируем заголовки ответа (фильтруем CORS заголовки!)
		for key, values := range resp.Header {
			// Пропускаем CORS заголовки от backend
			if strings.HasPrefix(key, "Access-Control-") {
				continue
			}
			for _, value := range values {
				w.Header().Add(key, value)
			}
		}

		// Копируем status code
		w.WriteHeader(resp.StatusCode)

		// Копируем body
		io.Copy(w, resp.Body)

		duration := time.Since(start)
		log.Printf("✅ Proxied to %s: %s %s → %d (took %dms)",
			service.Name,
			r.Method,
			r.URL.Path,
			resp.StatusCode,
			duration.Milliseconds(),
		)
	}
}
