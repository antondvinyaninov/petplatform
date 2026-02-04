package main

import (
	"net/http"

	"github.com/gorilla/mux"
)

func SetupRouter() *mux.Router {
	router := mux.NewRouter()

	// Применяем глобальные middleware
	router.Use(LoggingMiddleware)
	router.Use(CORSMiddleware)
	router.Use(RateLimitMiddleware)

	// 1. Health check (публичный)
	router.HandleFunc("/health", HealthCheckHandler).Methods("GET", "OPTIONS")

	// 2. WebSocket (ВАЖНО: ДО всех PathPrefix, защищенный)
	router.HandleFunc("/ws", WebSocketProxyHandler(mainService)).Methods("GET")

	// 3. Auth endpoints (публичные, обрабатывает Gateway)
	authRouter := router.PathPrefix("/api/auth").Subrouter()
	authRouter.HandleFunc("/register", RegisterHandler).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/login", LoginHandler).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/logout", LogoutHandler).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/me", AuthMiddlewareFunc(MeHandler)).Methods("GET", "OPTIONS")

	// 4. API endpoints (защищенные, проксируются на сервисы)
	apiRouter := router.PathPrefix("/api").Subrouter()
	apiRouter.Use(AuthMiddleware) // Проверка JWT

	// Специфичные маршруты сервисов (должны быть ПЕРЕД общими)
	if clinicService != nil {
		apiRouter.PathPrefix("/clinic").HandlerFunc(ProxyHandler(clinicService))
	}
	if petbaseService != nil {
		apiRouter.PathPrefix("/petbase").HandlerFunc(ProxyHandler(petbaseService))
	}
	if shelterService != nil {
		apiRouter.PathPrefix("/shelter").HandlerFunc(ProxyHandler(shelterService))
	}
	if volunteerService != nil {
		apiRouter.PathPrefix("/volunteer").HandlerFunc(ProxyHandler(volunteerService))
	}

	// Main Backend endpoints (общие маршруты)
	apiRouter.PathPrefix("/posts").HandlerFunc(ProxyHandler(mainService))
	apiRouter.PathPrefix("/profile").HandlerFunc(ProxyHandler(mainService))
	apiRouter.PathPrefix("/users").HandlerFunc(ProxyHandler(mainService))
	apiRouter.PathPrefix("/pets").HandlerFunc(ProxyHandler(mainService))
	apiRouter.PathPrefix("/organizations").HandlerFunc(ProxyHandler(mainService))
	apiRouter.PathPrefix("/comments").HandlerFunc(ProxyHandler(mainService))
	apiRouter.PathPrefix("/likes").HandlerFunc(ProxyHandler(mainService))
	apiRouter.PathPrefix("/favorites").HandlerFunc(ProxyHandler(mainService))
	apiRouter.PathPrefix("/friends").HandlerFunc(ProxyHandler(mainService))
	apiRouter.PathPrefix("/notifications").HandlerFunc(ProxyHandler(mainService))
	apiRouter.PathPrefix("/messages").HandlerFunc(ProxyHandler(mainService))
	apiRouter.PathPrefix("/announcements").HandlerFunc(ProxyHandler(mainService))
	apiRouter.PathPrefix("/polls").HandlerFunc(ProxyHandler(mainService))
	apiRouter.PathPrefix("/reports").HandlerFunc(ProxyHandler(mainService))

	// Admin endpoints (только для admin/superadmin)
	adminRouter := apiRouter.PathPrefix("/admin").Subrouter()
	adminRouter.Use(AdminMiddleware) // Проверка роли
	adminRouter.PathPrefix("/").HandlerFunc(ProxyHandler(mainService))

	// 5. Gateway root - показывает статус (НЕ frontend!)
	router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		respondJSON(w, map[string]interface{}{
			"service": "ZooPlatforma API Gateway",
			"version": "1.2.1",
			"status":  "running",
			"role":    "API Gateway & SSO Provider",
			"endpoints": map[string]string{
				"health":    "GET /health",
				"login":     "POST /api/auth/login",
				"register":  "POST /api/auth/register",
				"logout":    "POST /api/auth/logout",
				"me":        "GET /api/auth/me",
				"websocket": "WS /ws (requires auth_token cookie)",
				"main_api":  "/api/* → Main Service",
				"petbase":   "/api/petbase/* → PetBase Service (if configured)",
				"clinic":    "/api/clinic/* → Clinic Service (if configured)",
				"shelter":   "/api/shelter/* → Shelter Service (if configured)",
				"volunteer": "/api/volunteer/* → Volunteer Service (if configured)",
			},
			"frontend": "https://my-projects-zooplatforma.crv1ic.easypanel.host",
		})
	}).Methods("GET")

	return router
}
