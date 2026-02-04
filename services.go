package main

import (
	"log"
	"os"
)

type Service struct {
	Name string
	URL  string
}

var mainService *Service

func InitServices() {
	mainServiceURL := os.Getenv("MAIN_SERVICE_URL")
	if mainServiceURL == "" {
		// Для локальной разработки
		mainServiceURL = "http://localhost:80"
	}

	mainService = &Service{
		Name: "Main Service",
		URL:  mainServiceURL,
	}

	log.Println("📡 Configured services:")
	log.Printf("   Main Service: %s", mainService.URL)
}
