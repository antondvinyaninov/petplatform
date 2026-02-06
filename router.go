package main

import (
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

func SetupRouter() *mux.Router {
	router := mux.NewRouter()

	// 1. Health check (публичный, БЕЗ middleware)
	router.HandleFunc("/health", HealthCheckHandler).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/health", HealthCheckHandler).Methods("GET", "OPTIONS") // Дублируем для /api/health
	router.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		respondJSON(w, map[string]interface{}{
			"status": "ok",
			"time":   time.Now().Unix(),
		})
	}).Methods("GET", "OPTIONS")

	// 2. WebSocket (КРИТИЧНО: БЕЗ LoggingMiddleware!)
	// НЕ используем router.Use() для WebSocket
	router.HandleFunc("/ws", WebSocketProxyHandler(mainService)).Methods("GET")

	// 3. Auth endpoints (публичные, С middleware) - ДОЛЖНЫ БЫТЬ ПЕРЕД /api/*
	authRouter := router.PathPrefix("/api/auth").Subrouter()
	authRouter.Use(LoggingMiddleware)
	authRouter.Use(CORSMiddleware)
	authRouter.Use(RateLimitMiddleware)
	authRouter.HandleFunc("/register", RegisterHandler).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/login", LoginHandler).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/logout", LogoutHandler).Methods("POST", "OPTIONS")
	authRouter.HandleFunc("/me", AuthMiddlewareFunc(MeHandler)).Methods("GET", "OPTIONS")
	authRouter.HandleFunc("/profile", AuthMiddlewareFunc(UpdateProfileHandler)).Methods("PUT", "PATCH", "OPTIONS")

	// 4. Публичные API endpoints (БЕЗ авторизации, для SEO)
	publicApiRouter := router.PathPrefix("/api").Subrouter()
	publicApiRouter.Use(LoggingMiddleware)
	publicApiRouter.Use(CORSMiddleware)
	publicApiRouter.Use(RateLimitMiddleware)
	// Публичный просмотр профилей пользователей (для SEO)
	publicApiRouter.HandleFunc("/users/{id:[0-9]+}", ProxyHandler(mainService).ServeHTTP).Methods("GET", "OPTIONS")
	// Публичный просмотр постов пользователя (для SEO)
	publicApiRouter.HandleFunc("/posts/user/{id:[0-9]+}", ProxyHandler(mainService).ServeHTTP).Methods("GET", "OPTIONS")
	// Публичный просмотр комментариев к посту (для SEO)
	publicApiRouter.HandleFunc("/comments/post/{id:[0-9]+}", ProxyHandler(mainService).ServeHTTP).Methods("GET", "OPTIONS")
	// Sitemap endpoints для поисковиков
	publicApiRouter.HandleFunc("/sitemap/users", ProxyHandler(mainService).ServeHTTP).Methods("GET", "OPTIONS")
	publicApiRouter.HandleFunc("/sitemap/posts", ProxyHandler(mainService).ServeHTTP).Methods("GET", "OPTIONS")

	// 5. API endpoints (защищенные, проксируются на сервисы)
	apiRouter := router.PathPrefix("/api").Subrouter()
	apiRouter.Use(LoggingMiddleware)
	apiRouter.Use(CORSMiddleware)
	apiRouter.Use(RateLimitMiddleware)
	apiRouter.Use(AuthMiddleware) // Проверка JWT

	// Chunked upload endpoints (должны быть ПЕРВЫМИ для правильной маршрутизации)
	apiRouter.PathPrefix("/media/chunked").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/media").Handler(ProxyHandler(mainService))

	// Специфичные маршруты сервисов (должны быть ПЕРЕД общими)
	if clinicService != nil {
		apiRouter.PathPrefix("/clinic").Handler(ProxyHandler(clinicService))
	}
	if petbaseService != nil {
		apiRouter.PathPrefix("/petbase").Handler(ProxyHandler(petbaseService))
	}
	if shelterService != nil {
		apiRouter.PathPrefix("/shelter").Handler(ProxyHandler(shelterService))
	}
	if volunteerService != nil {
		apiRouter.PathPrefix("/volunteer").Handler(ProxyHandler(volunteerService))
	}

	// Main Backend endpoints (общие маршруты)
	apiRouter.PathPrefix("/posts").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/profile").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/users").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/pets").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/organizations").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/comments").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/likes").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/favorites").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/friends").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/notifications").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/chats").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/messages").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/announcements").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/polls").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/reports").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/roles").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/verification").Handler(ProxyHandler(mainService))

	// Admin endpoints (только для admin/superadmin)
	adminRouter := apiRouter.PathPrefix("/admin").Subrouter()
	adminRouter.Use(AdminMiddleware) // Проверка роли
	adminRouter.PathPrefix("/").Handler(ProxyHandler(mainService))

	// 6. Gateway root - показывает статус (НЕ frontend!)
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
