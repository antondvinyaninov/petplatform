package handlers

import (
	"fmt"
	"net/http"

	"github.com/gorilla/mux"
)

// AdminPostsHandler - список постов через gateway
func AdminPostsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	// Получаем параметры запроса (фильтры, пагинация)
	query := r.URL.Query().Encode()
	endpoint := "/api/posts"
	if query != "" {
		endpoint += "?" + query
	}

	data, err := client.Get(endpoint)
	proxyGatewayResponse(w, data, err)
}

// AdminPostHandler - действия с постом
func AdminPostHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	postID := vars["id"]

	if postID == "" {
		sendError(w, "Неверный ID поста", http.StatusBadRequest)
		return
	}

	client, err := getGatewayClient(r)
	if err != nil {
		sendError(w, "Не авторизован", http.StatusUnauthorized)
		return
	}

	endpoint := fmt.Sprintf("/api/posts/%s", postID)

	switch r.Method {
	case http.MethodGet:
		data, err := client.Get(endpoint)
		proxyGatewayResponse(w, data, err)

	case http.MethodPut:
		var body map[string]interface{}
		if err := parseJSONBody(r, &body); err != nil {
			sendError(w, "Неверный формат данных", http.StatusBadRequest)
			return
		}

		data, err := client.Put(endpoint, body)
		proxyGatewayResponse(w, data, err)

	case http.MethodDelete:
		data, err := client.Delete(endpoint)
		proxyGatewayResponse(w, data, err)

	default:
		sendError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}
