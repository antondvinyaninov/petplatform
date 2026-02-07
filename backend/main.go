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

	// Protected admin routes (требуют superadmin)
	adminRouter := router.PathPrefix("/api/admin").Subrouter()
	adminRouter.Use(func(next http.Handler) http.Handler {
		return middleware.AuthMiddleware(next)
	})
	adminRouter.Use(func(next http.Handler) http.Handler {
		return middleware.SuperAdminMiddleware(next)
	})

	// Users
	adminRouter.HandleFunc("/users", handlers.AdminUsersHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/users/{id:[0-9]+}", handlers.AdminUserHandler).Methods("GET", "PUT", "DELETE", "OPTIONS")

	// Posts
	adminRouter.HandleFunc("/posts", handlers.AdminPostsHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/posts/{id:[0-9]+}", handlers.AdminPostHandler).Methods("GET", "PUT", "DELETE", "OPTIONS")

	// Organizations
	adminRouter.HandleFunc("/organizations", handlers.AdminOrganizationsHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/organizations/{id:[0-9]+}/verify", handlers.AdminVerifyOrganizationHandler).Methods("PUT", "OPTIONS")
	adminRouter.HandleFunc("/organizations/stats", handlers.AdminOrganizationStatsHandler).Methods("GET", "OPTIONS")

	// Stats
	adminRouter.HandleFunc("/stats/overview", handlers.AdminStatsOverviewHandler).Methods("GET", "OPTIONS")

	// Logs
	adminRouter.HandleFunc("/logs", handlers.AdminLogsHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/logs/stats", handlers.AdminLogsStatsHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/user-activity", handlers.UserActivityHandler).Methods("GET", "OPTIONS")

	// Monitoring
	adminRouter.HandleFunc("/monitoring/errors", handlers.GetRecentErrorsHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/monitoring/metrics", handlers.GetSystemMetricsHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/monitoring/error-stats", handlers.GetErrorStatsByServiceHandler).Methods("GET", "OPTIONS")

	// Moderation
	adminRouter.HandleFunc("/moderation/reports", handlers.GetReportsHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/moderation/reports/{id:[0-9]+}", handlers.ReviewReportHandler).Methods("PUT", "OPTIONS")
	adminRouter.HandleFunc("/moderation/stats", handlers.GetModerationStatsHandler).Methods("GET", "OPTIONS")

	// Health check for all services
	adminRouter.HandleFunc("/health/services", handlers.HealthCheckHandler).Methods("GET", "OPTIONS")

	port := os.Getenv("PORT")
	if port == "" {
		port = "9000"
	}

	fmt.Printf("🔐 Admin Panel API starting on port %s\n", port)
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
	fmt.Fprintf(w, `{"message": "ЗооПлатформа Admin API", "version": "0.1.0"}`)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status": "ok", "service": "admin-api"}`)
}
