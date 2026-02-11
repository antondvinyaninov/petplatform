package main

import (
	"admin/handlers"
	"admin/middleware"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	// Check JWT_SECRET
	secret := os.Getenv("JWT_SECRET")
	if secret == "" || secret == "your-secret-key-here-change-in-production" {
		log.Fatal("❌ JWT_SECRET must be set in .env file!")
	}
	log.Printf("✅ JWT_SECRET loaded: %s...\n", secret[:10])

	// Check GATEWAY_URL
	gatewayURL := os.Getenv("GATEWAY_URL")
	if gatewayURL == "" {
		gatewayURL = "http://localhost:80"
	}
	log.Printf("✅ Gateway URL: %s\n", gatewayURL)

	// Initialize gateway client
	middleware.InitGateway(gatewayURL)

	// Setup router
	router := mux.NewRouter()

	// CORS middleware
	router.Use(corsMiddleware)

	// Public routes
	router.HandleFunc("/", handleRoot).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/admin/health", handleHealth).Methods("GET", "OPTIONS")

	// Auth routes (проверка через gateway)
	router.HandleFunc("/api/admin/auth/me", func(w http.ResponseWriter, r *http.Request) {
		middleware.AuthMiddleware(http.HandlerFunc(handlers.AdminMeHandler)).ServeHTTP(w, r)
	}).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/admin/auth/logout", handlers.AdminLogoutHandler).Methods("POST", "OPTIONS")

	// Protected routes (требуют авторизации)
	protectedRouter := router.PathPrefix("/api/admin").Subrouter()
	protectedRouter.Use(func(next http.Handler) http.Handler {
		return middleware.AuthMiddleware(next)
	})

	// Pets (Питомцы) - доступны всем авторизованным пользователям
	protectedRouter.HandleFunc("/pets", handlers.AdminPetsHandler).Methods("GET", "POST", "OPTIONS")
	protectedRouter.HandleFunc("/pets/{id:[0-9]+}", handlers.AdminPetHandler).Methods("GET", "PUT", "DELETE", "OPTIONS")
	protectedRouter.HandleFunc("/pets/{id:[0-9]+}/photo", handlers.UploadPetPhotoHandler).Methods("POST", "OPTIONS")
	protectedRouter.HandleFunc("/pets/{id:[0-9]+}/medical-records", handlers.PetMedicalRecordsHandler).Methods("GET", "POST", "OPTIONS")
	protectedRouter.HandleFunc("/pets/{id:[0-9]+}/treatments", handlers.PetTreatmentsHandler).Methods("GET", "POST", "OPTIONS")
	protectedRouter.HandleFunc("/pets/{id:[0-9]+}/vaccinations", handlers.PetVaccinationsHandler).Methods("GET", "POST", "OPTIONS")
	protectedRouter.HandleFunc("/pets/{id:[0-9]+}/changelog", handlers.PetChangelogHandler).Methods("GET", "OPTIONS")

	// Breeds (Породы) - доступны всем авторизованным пользователям
	protectedRouter.HandleFunc("/breeds", handlers.AdminBreedsHandler).Methods("GET", "OPTIONS")

	port := os.Getenv("PORT")
	if port == "" {
		port = "9000"
	}

	fmt.Printf("🐾 Volunteer Cabinet API starting on port %s\n", port)
	fmt.Println("📊 Dashboard: http://localhost:4000")
	fmt.Printf("🔗 Gateway: %s\n", gatewayURL)
	log.Fatal(http.ListenAndServe(":"+port, router))
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowedOrigins := strings.Split(os.Getenv("CORS_ORIGINS"), ",")
		if len(allowedOrigins) == 0 {
			allowedOrigins = []string{"http://localhost:4000", "http://localhost:3000"}
		}

		originAllowed := false
		for _, allowed := range allowedOrigins {
			if origin == strings.TrimSpace(allowed) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				originAllowed = true
				break
			}
		}

		if !originAllowed && origin == "" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func handleRoot(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"message": "ЗооПлатформа - Кабинет зоопомощника API", "version": "0.1.0"}`)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status": "ok", "service": "volunteer-cabinet-api"}`)
}
