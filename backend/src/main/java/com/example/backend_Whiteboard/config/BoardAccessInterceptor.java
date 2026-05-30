package com.example.backend_Whiteboard.config;

import com.example.backend_Whiteboard.repository.BoardRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.UUID;

@Component
public class BoardAccessInterceptor implements HandlerInterceptor {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private BoardRepository boardRepository;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // If it's an OPTIONS request for CORS, let it pass
        if (request.getMethod().equals("OPTIONS")) {
            return true;
        }

        String path = request.getRequestURI();
        
        // We only care about /api/board/... paths
        if (path.startsWith("/api/board/")) {
            String[] segments = path.split("/");
            // Path structure: ["", "api", "board", "{boardId}", ...]
            if (segments.length >= 4) {
                String potentialBoardId = segments[3];
                UUID boardId = null;
                try {
                    boardId = UUID.fromString(potentialBoardId);
                } catch (IllegalArgumentException e) {
                    // Not a valid UUID, so it's not a board ID path (e.g., could be some other endpoint)
                    return true;
                }

                // Bypass authorization check if the user is just requesting access
                if (path.endsWith("/request-access")) {
                    return true;
                }

                // If it is a valid boardId, we must verify authorization
                String authHeader = request.getHeader("Authorization");
                if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.getWriter().write("{\"error\": \"Unauthorized: Missing or invalid token\"}");
                    return false;
                }

                try {
                    String token = authHeader.substring(7);
                    UUID userId = jwtUtil.getUserIdFromToken(token);

                    boolean hasAccess = boardRepository.hasAccessToBoard(boardId, userId);
                    if (!hasAccess) {
                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        response.getWriter().write("{\"error\": \"Forbidden: You do not have access to this board\"}");
                        return false;
                    }
                } catch (Exception e) {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.getWriter().write("{\"error\": \"Unauthorized: Invalid token\"}");
                    return false;
                }
            }
        }

        return true;
    }
}
