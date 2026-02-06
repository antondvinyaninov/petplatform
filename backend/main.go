package main

import (
	"backend/db"
	"backend/handlers"
	"backend/middleware"
	"backend/storage"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

func enableCORS(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Для локальной разработки добавляем CORS
		// В production Gateway управляет CORS
		origin := r.Header.Get("Origin")

		// Разрешенные origins для локальной разработки
		allowedOrigins := map[string]bool{
			"http://localhost:3000": true,
			"http://localhost:3001": true,
		}

		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		}

		// Обрабатываем preflight запрос
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

// enableCORSHandler - версия для http.Handler (используется с middleware)
func enableCORSHandler(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Для локальной разработки добавляем CORS
		// В production Gateway управляет CORS
		origin := r.Header.Get("Origin")

		// Разрешенные origins для локальной разработки
		allowedOrigins := map[string]bool{
			"http://localhost:3000": true,
			"http://localhost:3001": true,
		}

		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		}

		// Обрабатываем preflight запрос
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// protectedRoute - обертка для защищенных роутов
// Использует DevAuthMiddleware для локальной разработки
func protectedRoute(handler http.HandlerFunc) http.HandlerFunc {
	return enableCORS(middleware.DevAuthMiddleware(handler))
}

func main() {
	log.Println("🚀 Starting PetPlatform Backend...")

	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  Warning: .env file not found, using environment variables")
	}

	// Log environment
	env := os.Getenv("ENVIRONMENT")
	if env == "" {
		env = "development"
	}
	log.Printf("📍 Environment: %s", env)

	authServiceURL := os.Getenv("AUTH_SERVICE_URL")
	if authServiceURL == "" {
		authServiceURL = "http://localhost:7100"
		log.Printf("⚠️  AUTH_SERVICE_URL not set, using default: %s\n", authServiceURL)
	} else {
		log.Printf("🔐 Auth Service URL: %s\n", authServiceURL)
	}

	// ✅ Gateway теперь обрабатывает авторизацию
	log.Printf("🚀 Running behind API Gateway - auth handled by Gateway")

	// Initialize database
	log.Println("📊 Connecting to database...")
	if err := db.InitDB(); err != nil {
		log.Printf("❌ Failed to initialize database: %v", err)
		log.Fatal("Cannot start without database connection")
	}
	defer db.CloseDB()

	// Initialize S3 storage
	log.Println("☁️  Initializing S3 storage...")
	if err := storage.InitS3(); err != nil {
		log.Printf("⚠️  S3 initialization failed: %v", err)
		log.Println("📁 Falling back to local file storage")
	}

	// Initialize WebSocket hub
	log.Println("🔌 Initializing WebSocket hub...")
	handlers.InitWebSocketHub(db.DB)
	log.Println("✅ WebSocket hub initialized")

	// Public API routes (register BEFORE root route)
	http.HandleFunc("/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("pong"))
	})
	http.HandleFunc("/api/health", enableCORS(handleHealth))
	http.HandleFunc("/api/auth/register", enableCORS(handlers.RegisterHandler))
	http.HandleFunc("/api/auth/login", enableCORS(handlers.LoginHandler))
	http.HandleFunc("/api/auth/logout", enableCORS(handlers.LogoutHandler))
	http.HandleFunc("/api/auth/me", enableCORS(handlers.MeHandler))
	http.HandleFunc("/api/auth/verify", enableCORS(handlers.VerifyTokenHandler))

	// Public user profile endpoint
	http.HandleFunc("/api/users/", enableCORS(handlers.UserHandler))               // Публичный просмотр профилей пользователей
	http.HandleFunc("/api/users/stats", enableCORS(handlers.GetUsersStatsHandler)) // Публичная статистика пользователей

	// Sitemap endpoints (публичные для SEO)
	http.HandleFunc("/api/sitemap/users", enableCORS(handlers.GetSitemapUsersHandler)) // Список пользователей для sitemap
	http.HandleFunc("/api/sitemap/posts", enableCORS(handlers.GetSitemapPostsHandler)) // Список постов для sitemap

	// Protected routes (требуют авторизации)
	http.HandleFunc("/api/users", protectedRoute(handlers.UsersHandler))
	http.HandleFunc("/api/profile", protectedRoute(handlers.UpdateProfileHandler))
	http.HandleFunc("/api/auth/profile", protectedRoute(handlers.UpdateProfileHandler)) // Алиас для Gateway
	http.HandleFunc("/api/profile/avatar", protectedRoute(handlers.UploadAvatarHandler))
	http.HandleFunc("/api/profile/avatar/delete", protectedRoute(handlers.DeleteAvatarHandler))
	http.HandleFunc("/api/profile/cover", protectedRoute(handlers.UploadCoverPhotoHandler))
	http.HandleFunc("/api/profile/cover/delete", protectedRoute(handlers.DeleteCoverPhotoHandler))
	http.HandleFunc("/api/posts/drafts", protectedRoute(handlers.DraftsHandler))

	// /api/posts - GET опциональная авторизация, POST требует авторизации
	http.HandleFunc("/api/posts", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			// POST требует авторизации
			protectedRoute(handlers.PostsHandler)(w, r)
		} else {
			// GET опциональная авторизация (userID в контексте если авторизован)
			middleware.DevOptionalAuthMiddleware(handlers.PostsHandler)(w, r)
		}
	}))

	// /api/posts/ - универсальный обработчик для всех подпутей
	http.HandleFunc("/api/posts/", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path

		// Специфичные роуты - проверяем первыми (опциональная авторизация для GET)
		if strings.HasPrefix(path, "/api/posts/user/") {
			middleware.DevOptionalAuthMiddleware(handlers.UserPostsHandler)(w, r)
			return
		}
		if strings.HasPrefix(path, "/api/posts/pet/") {
			middleware.DevOptionalAuthMiddleware(handlers.PetPostsHandler)(w, r)
			return
		}
		if strings.HasPrefix(path, "/api/posts/organization/") {
			middleware.DevOptionalAuthMiddleware(handlers.OrganizationPostsHandler)(w, r)
			return
		}

		// /like endpoint - GET опциональная авторизация, POST обязательная
		if strings.HasSuffix(path, "/like") {
			if r.Method == "GET" {
				// GET: авторизация опциональна (userID может быть 0)
				middleware.DevOptionalAuthMiddleware(handlers.LikesHandler)(w, r)
			} else {
				// POST/DELETE: авторизация обязательна
				middleware.DevAuthMiddleware(handlers.LikesHandler)(w, r)
			}
			return
		}

		// Обычные посты /api/posts/{id}
		// GET опциональная авторизация, PUT/DELETE требуют авторизации
		if r.Method == http.MethodPut || r.Method == http.MethodDelete {
			middleware.DevAuthMiddleware(handlers.PostHandler)(w, r)
		} else {
			// GET: опциональная авторизация
			middleware.DevOptionalAuthMiddleware(handlers.PostHandler)(w, r)
		}
	}))

	// Comments - POST/DELETE требуют авторизации
	http.HandleFunc("/api/comments/post/", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			middleware.DevAuthMiddleware(handlers.CommentsHandler)(w, r)
		} else {
			handlers.CommentsHandler(w, r)
		}
	}))
	http.HandleFunc("/api/comments/", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "DELETE" {
			middleware.DevAuthMiddleware(handlers.DeleteCommentHandler)(w, r)
		} else {
			handlers.DeleteCommentHandler(w, r)
		}
	}))

	// Polls - POST требует авторизации
	http.HandleFunc("/api/polls/", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			middleware.DevAuthMiddleware(handlers.VoteHandler)(w, r)
		} else {
			handlers.VoteHandler(w, r)
		}
	}))

	// Poll by post_id - GET /api/polls/post/:post_id (публичный, но показывает голоса только авторизованным)
	http.HandleFunc("/api/polls/post/", enableCORS(handlers.GetPollByPostHandler))

	// Pets (Gateway проверяет авторизацию для защищенных endpoints)
	http.HandleFunc("/api/pets", enableCORS(handlers.PetsHandler))
	http.HandleFunc("/api/pets/user/", enableCORS(handlers.UserPetsHandler))       // Публичный endpoint
	http.HandleFunc("/api/pets/curated/", enableCORS(handlers.CuratedPetsHandler)) // Публичный endpoint
	http.HandleFunc("/api/pets/", enableCORS(handlers.PetHandler))                 // Gateway проверяет для DELETE

	// Pet Announcements (Gateway проверяет авторизацию)
	http.HandleFunc("/api/announcements", enableCORS(handlers.AnnouncementsHandler))
	http.HandleFunc("/api/announcements/", enableCORS(handlers.AnnouncementHandler))
	http.HandleFunc("/api/announcements/posts/", enableCORS(handlers.AnnouncementPostsHandler))
	http.HandleFunc("/api/announcements/donations/", enableCORS(handlers.AnnouncementDonationsHandler))

	// Friends (требует авторизацию)
	http.HandleFunc("/api/friends", protectedRoute(handlers.GetFriendsHandler))
	http.HandleFunc("/api/friends/requests", protectedRoute(handlers.GetFriendRequestsHandler))
	http.HandleFunc("/api/friends/send", protectedRoute(handlers.SendFriendRequestHandler))
	http.HandleFunc("/api/friends/accept", protectedRoute(handlers.AcceptFriendRequestHandler))
	http.HandleFunc("/api/friends/reject", protectedRoute(handlers.RejectFriendRequestHandler))
	http.HandleFunc("/api/friends/remove", protectedRoute(handlers.RemoveFriendHandler))
	http.HandleFunc("/api/friends/status", protectedRoute(handlers.GetFriendshipStatusHandler))

	// Notifications (требует авторизацию)
	notificationsHandler := &handlers.NotificationsHandler{DB: db.DB}
	http.HandleFunc("/api/notifications", protectedRoute(notificationsHandler.GetNotifications))
	http.HandleFunc("/api/notifications/unread", protectedRoute(notificationsHandler.GetUnreadCount))
	http.HandleFunc("/api/notifications/read-all", protectedRoute(notificationsHandler.MarkAllAsRead))
	http.HandleFunc("/api/notifications/", protectedRoute(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "PUT" {
			notificationsHandler.MarkAsRead(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	// Organizations
	http.HandleFunc("/api/organizations/all", enableCORS(handlers.GetAllOrganizationsHandler))                                               // Публичный endpoint
	http.HandleFunc("/api/organizations/my", protectedRoute(handlers.GetMyOrganizationsHandler))                                             // Требует авторизацию
	http.HandleFunc("/api/organizations/user/", protectedRoute(handlers.GetUserOrganizationsHandler))                                        // Требует авторизацию
	http.HandleFunc("/api/organizations/members/add", protectedRoute(handlers.AddMemberHandler))                                             // Требует авторизацию
	http.HandleFunc("/api/organizations/members/update", protectedRoute(handlers.UpdateMemberHandler))                                       // Требует авторизацию
	http.HandleFunc("/api/organizations/members/remove", protectedRoute(handlers.RemoveMemberHandler))                                       // Требует авторизацию
	http.HandleFunc("/api/organizations/members/", enableCORS(middleware.DevOptionalAuthMiddleware(handlers.GetOrganizationMembersHandler))) // Опциональная авторизация
	http.HandleFunc("/api/organizations/claim-ownership/", protectedRoute(handlers.ClaimOwnershipHandler))                                   // Требует авторизацию
	http.HandleFunc("/api/organizations/check-inn/", enableCORS(handlers.CheckOrganizationByInnHandler))                                     // Публичный endpoint

	// Organizations CRUD - должны быть после более специфичных роутов
	http.HandleFunc("/api/organizations", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			// POST требует авторизации
			protectedRoute(handlers.CreateOrganizationHandler)(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	}))
	http.HandleFunc("/api/organizations/", enableCORS(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			// GET опциональная авторизация
			middleware.DevOptionalAuthMiddleware(handlers.OrganizationHandler)(w, r)
		} else {
			// PUT/DELETE требуют авторизации
			protectedRoute(handlers.OrganizationHandler)(w, r)
		}
	}))

	// Messenger (личные чаты 1-1) (требует авторизацию)
	http.HandleFunc("/api/chats", protectedRoute(handlers.GetChatsHandler(db.DB)))
	http.HandleFunc("/api/chats/", protectedRoute(handlers.GetChatMessagesHandler(db.DB)))
	http.HandleFunc("/api/messages/send", protectedRoute(handlers.SendMessageHandler(db.DB)))
	http.HandleFunc("/api/messages/send-media", protectedRoute(handlers.SendMediaMessageHandler(db.DB)))
	http.HandleFunc("/api/messages/unread", protectedRoute(handlers.GetUnreadCountHandler(db.DB)))

	// WebSocket для real-time уведомлений (требует авторизацию)
	http.HandleFunc("/ws", protectedRoute(handlers.HandleWebSocket(db.DB)))

	// Favorites (избранные питомцы) - требует авторизацию
	http.HandleFunc("/api/favorites", protectedRoute(handlers.FavoritesHandler))
	http.HandleFunc("/api/favorites/", protectedRoute(handlers.FavoriteDetailHandler))

	// Roles (система ролей) (Gateway проверяет авторизацию)
	http.HandleFunc("/api/roles/available", enableCORS(handlers.GetAllRolesHandler(db.DB)))
	http.HandleFunc("/api/roles/user/", enableCORS(handlers.GetUserRolesHandler(db.DB)))
	http.HandleFunc("/api/roles/grant", enableCORS(handlers.GrantRoleHandler(db.DB)))
	http.HandleFunc("/api/roles/revoke", enableCORS(handlers.RevokeRoleHandler(db.DB)))

	// Verification (верификация пользователей) (Gateway проверяет авторизацию для защищенных endpoints)
	http.HandleFunc("/api/verification/verify", enableCORS(handlers.VerifyUserHandler(db.DB)))
	http.HandleFunc("/api/verification/unverify", enableCORS(handlers.UnverifyUserHandler(db.DB)))
	http.HandleFunc("/api/verification/status/", enableCORS(handlers.GetUserVerificationStatusHandler(db.DB)))
	http.HandleFunc("/api/users/verified", enableCORS(handlers.GetVerifiedUsersHandler(db.DB)))

	// Admin Logs (логи действий администраторов) (Gateway проверяет авторизацию)
	http.HandleFunc("/api/admin/logs", enableCORS(handlers.AdminLogsHandler))
	http.HandleFunc("/api/admin/logs/stats", enableCORS(handlers.GetAdminLogStats))

	// User Activity (отслеживание активности пользователей) (Gateway проверяет авторизацию для защищенных endpoints)
	http.HandleFunc("/api/activity/update", enableCORS(handlers.UpdateUserActivityHandler(db.DB)))
	http.HandleFunc("/api/activity/online", enableCORS(handlers.GetOnlineUsersCountHandler(db.DB)))
	http.HandleFunc("/api/activity/stats", enableCORS(handlers.GetUserActivityStatsHandler(db.DB)))

	// User Logs (логи действий пользователей) (Gateway проверяет авторизацию)
	http.HandleFunc("/api/users/logs/", enableCORS(handlers.GetUserLogsHandler(db.DB)))
	http.HandleFunc("/api/users/storage/", enableCORS(handlers.GetUserStorageStatsHandler(db.DB)))

	// Reports (система жалоб) (Gateway проверяет авторизацию)
	http.HandleFunc("/api/reports", enableCORS(handlers.CreateReportHandler))

	// Media - более специфичные роуты должны быть первыми (Gateway проверяет авторизацию)
	mediaHandler := handlers.NewMediaHandler(db.DB)
	http.HandleFunc("/api/media/upload", protectedRoute(mediaHandler.UploadMedia))
	http.HandleFunc("/api/media/stats", protectedRoute(mediaHandler.GetMediaStats))
	http.HandleFunc("/api/media/user/", enableCORS(mediaHandler.GetUserMedia))
	http.HandleFunc("/api/media/file/", enableCORS(mediaHandler.GetMediaFile)) // Public для отображения
	http.HandleFunc("/api/media/delete/", protectedRoute(mediaHandler.DeleteMedia))

	// Chunked Upload (требует авторизации)
	chunkedHandler := handlers.NewChunkedUploadHandler(db.DB)
	http.HandleFunc("/api/media/chunked/initiate", protectedRoute(chunkedHandler.InitiateUpload))
	http.HandleFunc("/api/media/chunked/upload", protectedRoute(chunkedHandler.UploadChunk))
	http.HandleFunc("/api/media/chunked/complete", protectedRoute(chunkedHandler.CompleteUpload))

	// Static files - serve uploads directory from project root
	fs := http.FileServer(http.Dir("../.."))
	http.Handle("/uploads/", enableCORS(http.StripPrefix("/", fs).ServeHTTP))

	// Root route MUST be registered LAST
	http.HandleFunc("/", enableCORS(handleRoot))

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	log.Println("✅ All routes registered")
	log.Printf("🚀 Server starting on port %s", port)
	log.Printf("🌐 Health check: http://localhost:%s/api/health", port)

	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("❌ Failed to start server: %v", err)
	}
}

func handleRoot(w http.ResponseWriter, r *http.Request) {
	// Только для точного пути "/"
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"message": "Welcome to the API"}`)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status": "ok"}`)
}
