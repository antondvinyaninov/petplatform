package main

import (
	"log"
	"os"
)

type Service struct {
	Name string
	URL  string
}

var (
	mainService      *Service
	clinicService    *Service
	petbaseService   *Service
	shelterService   *Service
	volunteerService *Service
)

func InitServices() {
	mainServiceURL := os.Getenv("MAIN_SERVICE_URL")
	if mainServiceURL == "" {
		mainServiceURL = "http://localhost:80"
	}

	mainService = &Service{
		Name: "Main Service",
		URL:  mainServiceURL,
	}

	log.Println("📡 Configured services:")
	log.Printf("   Main Service: %s", mainService.URL)

	// Опциональные сервисы (если переменная не задана, сервис не используется)
	if clinicURL := os.Getenv("CLINIC_SERVICE_URL"); clinicURL != "" {
		clinicService = &Service{
			Name: "Clinic Service",
			URL:  clinicURL,
		}
		log.Printf("   Clinic Service: %s", clinicService.URL)
	}

	if petbaseURL := os.Getenv("PETBASE_SERVICE_URL"); petbaseURL != "" {
		petbaseService = &Service{
			Name: "PetBase Service",
			URL:  petbaseURL,
		}
		log.Printf("   PetBase Service: %s", petbaseService.URL)
	}

	if shelterURL := os.Getenv("SHELTER_SERVICE_URL"); shelterURL != "" {
		shelterService = &Service{
			Name: "Shelter Service",
			URL:  shelterURL,
		}
		log.Printf("   Shelter Service: %s", shelterService.URL)
	}

	if volunteerURL := os.Getenv("VOLUNTEER_SERVICE_URL"); volunteerURL != "" {
		volunteerService = &Service{
			Name: "Volunteer Service",
			URL:  volunteerURL,
		}
		log.Printf("   Volunteer Service: %s", volunteerService.URL)
	}
}
