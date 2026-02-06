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
	// Публичный просмотр организаций (для SEO и админки)
	publicApiRouter.HandleFunc("/organizations", ProxyHandler(mainService).ServeHTTP).Methods("GET", "OPTIONS")
	publicApiRouter.HandleFunc("/organizations/all", ProxyHandler(mainService).ServeHTTP).Methods("GET", "OPTIONS")
	publicApiRouter.HandleFunc("/organizations/{id:[0-9]+}", ProxyHandler(mainService).ServeHTTP).Methods("GET", "OPTIONS")
	publicApiRouter.HandleFunc("/organizations/{id:[0-9]+}/members", ProxyHandler(mainService).ServeHTTP).Methods("GET", "OPTIONS")
	// Sitemap endpoints для поисковиков
	publicApiRouter.HandleFunc("/sitemap/users", ProxyHandler(mainService).ServeHTTP).Methods("GET", "OPTIONS")
	publicApiRouter.HandleFunc("/sitemap/posts", ProxyHandler(mainService).ServeHTTP).Methods("GET", "OPTIONS")

	// 5. API endpoints (защищенные, проксируются на сервисы)
	apiRouter := router.PathPrefix("/api").Subrouter()
	apiRouter.Use(LoggingMiddleware)
	apiRouter.Use(CORSMiddleware)
	apiRouter.Use(RateLimitMiddleware)
	apiRouter.Use(AuthMiddleware) // Проверка JWT

	// Activity stats endpoint (требует авторизацию)
	apiRouter.HandleFunc("/activity/stats", ActivityStatsHandler).Methods("GET", "OPTIONS")

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
	// ВАЖНО: НЕ используем PathPrefix для /organizations, чтобы не конфликтовать с публичным GET
	apiRouter.PathPrefix("/posts").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/profile").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/users").Handler(ProxyHandler(mainService))
	apiRouter.PathPrefix("/pets").Handler(ProxyHandler(mainService))
	// organizations - только POST/PUT/DELETE (GET уже в публичном роутере)
	apiRouter.HandleFunc("/organizations", ProxyHandler(mainService).ServeHTTP).Methods("POST", "PUT", "DELETE", "PATCH", "OPTIONS")
	apiRouter.HandleFunc("/organizations/{id:[0-9]+}", ProxyHandler(mainService).ServeHTTP).Methods("POST", "PUT", "DELETE", "PATCH", "OPTIONS")
	apiRouter.HandleFunc("/organizations/{id:[0-9]+}/members", ProxyHandler(mainService).ServeHTTP).Methods("POST", "PUT", "DELETE", "PATCH", "OPTIONS")
	apiRouter.PathPrefix("/organizations").Handler(ProxyHandler(mainService)) // Остальные маршруты организаций
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

	// Admin-специфичные endpoints (обрабатываются Gateway)
	adminRouter.HandleFunc("/activity/stats", ActivityStatsHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/users", GetUsersHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/users/{id:[0-9]+}", GetUserByIDHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/verification/verify", VerifyUserHandler).Methods("POST", "OPTIONS")
	adminRouter.HandleFunc("/verification/unverify", UnverifyUserHandler).Methods("POST", "OPTIONS")
	adminRouter.HandleFunc("/roles/user/{id:[0-9]+}", GetUserRolesHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/roles/available", GetAvailableRolesHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/roles/grant", GrantRoleHandler).Methods("POST", "OPTIONS")
	adminRouter.HandleFunc("/roles/revoke", RevokeRoleHandler).Methods("POST", "OPTIONS")

	// Посты с опросами (новый endpoint)
	adminRouter.HandleFunc("/posts/with-polls", GetAllPostsWithPollsHandler).Methods("GET", "OPTIONS")

	// Admin logs endpoints
	adminRouter.HandleFunc("/logs", GetAdminLogsHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/logs/stats", GetAdminLogsStatsHandler).Methods("GET", "OPTIONS")

	// User activity logs endpoints
	adminRouter.HandleFunc("/user-activity", GetUserActivityLogsHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/user-activity/stats", GetUserActivityStatsHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/user-activity/user/:id", GetUserActivityByUserIDHandler).Methods("GET", "OPTIONS")

	// Остальные admin endpoints проксируются на backend
	adminRouter.HandleFunc("/posts", GetAllPostsHandler).Methods("GET", "OPTIONS")
	adminRouter.HandleFunc("/posts/{id:[0-9]+}", DeletePostHandler).Methods("DELETE", "OPTIONS")
	adminRouter.HandleFunc("/pets/user/{id:[0-9]+}", GetUserPetsHandler).Methods("GET", "OPTIONS")
	adminRouter.PathPrefix("/").Handler(ProxyHandler(mainService))

	// Moderation endpoints (модерация) - требует admin/superadmin
	moderationRouter := apiRouter.PathPrefix("/moderation").Subrouter()
	moderationRouter.Use(AdminMiddleware)
	moderationRouter.HandleFunc("/reports", GetReportsHandler).Methods("GET", "OPTIONS")
	moderationRouter.HandleFunc("/reports/{id:[0-9]+}", ReviewReportHandler).Methods("PUT", "OPTIONS")
	moderationRouter.HandleFunc("/stats", GetModerationStatsHandler).Methods("GET", "OPTIONS")

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
