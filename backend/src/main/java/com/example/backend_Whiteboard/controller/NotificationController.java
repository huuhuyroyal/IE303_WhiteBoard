package com.example.backend_Whiteboard.controller;

import com.example.backend_Whiteboard.model.Notification;
import com.example.backend_Whiteboard.repository.NotificationRepository;
import com.example.backend_Whiteboard.config.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private JwtUtil jwtUtil;

    // GET /api/notifications
    @GetMapping
    public ResponseEntity<?> getNotifications(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            String token = authHeader.substring(7);
            UUID userId = jwtUtil.getUserIdFromToken(token);

            List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
            
            List<Map<String, Object>> response = notifications.stream().map(n -> {
                Map<String, Object> map = new java.util.HashMap<>();
                map.put("id", n.getId());
                map.put("message", n.getMessage());
                map.put("type", n.getType());
                map.put("boardId", n.getBoardId() != null ? n.getBoardId() : "");
                map.put("isRead", n.isRead());
                map.put("createdAt", n.getCreatedAt());
                return map;
            }).collect(Collectors.toList());

            long unreadCount = notifications.stream().filter(n -> !n.isRead()).count();

            return ResponseEntity.ok(Map.of(
                "notifications", response,
                "unreadCount", unreadCount
            ));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
        }
    }

    // PATCH /api/notifications/{id}/read
    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable UUID id, @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            String token = authHeader.substring(7);
            UUID userId = jwtUtil.getUserIdFromToken(token);

            return notificationRepository.findById(id).map(notification -> {
                if (!notification.getUser().getId().equals(userId)) {
                    return ResponseEntity.status(403).body(Map.of("error", "Forbidden"));
                }
                notification.setRead(true);
                notificationRepository.save(notification);
                return ResponseEntity.ok(Map.of("message", "Marked as read"));
            }).orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // PATCH /api/notifications/read-all
    @PatchMapping("/read-all")
    public ResponseEntity<?> markAllAsRead(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            String token = authHeader.substring(7);
            UUID userId = jwtUtil.getUserIdFromToken(token);

            List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
            unread.forEach(n -> n.setRead(true));
            notificationRepository.saveAll(unread);

            return ResponseEntity.ok(Map.of("message", "All marked as read"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
