package com.example.backend_Whiteboard.controller;

import com.example.backend_Whiteboard.model.Board;
import com.example.backend_Whiteboard.model.User;
import com.example.backend_Whiteboard.model.BoardMember;
import com.example.backend_Whiteboard.repository.BoardRepository;
import com.example.backend_Whiteboard.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/board")
public class BoardController {

    @MessageMapping("/board/{boardId}/cursor")
    @SendTo("/topic/board/{boardId}/cursor")
    public String broadcastCursor(@DestinationVariable String boardId, String payload) {
        // Broadcast lại payload (chứa username, x, y) nguyên mẫu cho tất cả
        return payload;
    }

    @Autowired
    private BoardRepository boardRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private com.example.backend_Whiteboard.repository.BoardMemberRepository boardMemberRepository;

    @Autowired
    private com.example.backend_Whiteboard.repository.PermissionRequestRepository permissionRequestRepository;

    @Autowired
    private com.example.backend_Whiteboard.config.JwtUtil jwtUtil;

    // GET /api/board
    @GetMapping
    public ResponseEntity<?> getAllBoards(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            String token = authHeader.substring(7);
            UUID userId = jwtUtil.getUserIdFromToken(token);
            List<Board> boards = boardRepository.findAccessibleBoardsByUserId(userId);
            return ResponseEntity.ok(boards);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid token"));
        }
    }

    // GET /api/board/{id}
    @GetMapping("/{id}")
    public ResponseEntity<?> getBoardById(@PathVariable UUID id) {
        return boardRepository.findById(id).map(board -> {
            board.setLastOpenedAt(LocalDateTime.now());
            boardRepository.save(board);
            return ResponseEntity.ok(board);
        }).orElse(ResponseEntity.notFound().build());
    }

    // POST /api/board
    @PostMapping
    public ResponseEntity<?> createBoard(@RequestBody Map<String, String> body,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            String token = authHeader.substring(7);
            UUID userId = jwtUtil.getUserIdFromToken(token);
            String title = body.getOrDefault("title", "Untitled Board");
            User owner = userRepository.findById(userId).orElse(null);

            if (owner == null)
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));

            Board board = new Board(title, owner);
            board.setUpdatedAt(LocalDateTime.now());
            return ResponseEntity.ok(boardRepository.save(board));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // PATCH /api/board/{id}
    @PatchMapping("/{id}")
    public ResponseEntity<?> renameBoard(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        return boardRepository.findById(id).map(board -> {
            if (body.containsKey("title")) {
                board.setTitle(body.get("title"));
            }
            if (body.containsKey("thumbnail")) {
                board.setThumbnail(body.get("thumbnail"));
            }
            board.setUpdatedAt(LocalDateTime.now());
            return ResponseEntity.<Object>ok(boardRepository.save(board));
        }).orElse(ResponseEntity.notFound().build());
    }

    // DELETE /api/board/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBoard(@PathVariable UUID id) {
        if (!boardRepository.existsById(id))
            return ResponseEntity.notFound().build();
        boardRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // POST /api/board/{id}/share
    @PostMapping("/{id}/share")
    public ResponseEntity<?> shareBoard(@PathVariable UUID id, @RequestBody Map<String, String> body,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            String token = authHeader.substring(7);
            UUID currentUserId = jwtUtil.getUserIdFromToken(token);

            // Lấy board, kiểm tra quyền
            Board board = boardRepository.findById(id).orElse(null);
            if (board == null)
                return ResponseEntity.status(404).body(Map.of("error", "Board not found"));

            if (!board.getOwner().getId().equals(currentUserId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Only owner can share this board"));
            }

            // Tìm user cần share
            String targetUsername = body.get("username");
            if (targetUsername == null || targetUsername.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Target username is required"));
            }

            String role = body.getOrDefault("role", "EDITOR");

            User targetUser = userRepository.findByUsername(targetUsername).orElse(null);
            if (targetUser == null) {
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }

            if (targetUser.getId().equals(currentUserId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot share with yourself"));
            }

            // Cập nhật role nếu đã tồn tại, hoặc thêm mới
            com.example.backend_Whiteboard.model.BoardMember member = boardMemberRepository
                    .findByBoardIdAndUserId(board.getId(), targetUser.getId()).orElse(null);
            if (member != null) {
                member.setRole(role);
            } else {
                member = new com.example.backend_Whiteboard.model.BoardMember(board, targetUser, role);
            }
            boardMemberRepository.save(member);

            return ResponseEntity
                    .ok(Map.of("message", "Board shared successfully with " + targetUsername, "role", role));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // DELETE /api/board/{id}/members/{username}
    @DeleteMapping("/{id}/members/{username}")
    public ResponseEntity<?> removeMember(@PathVariable UUID id, @PathVariable String username,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            String token = authHeader.substring(7);
            UUID currentUserId = jwtUtil.getUserIdFromToken(token);

            Board board = boardRepository.findById(id).orElse(null);
            if (board == null)
                return ResponseEntity.status(404).body(Map.of("error", "Board not found"));

            if (!board.getOwner().getId().equals(currentUserId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Only owner can remove members"));
            }

            User targetUser = userRepository.findByUsername(username).orElse(null);
            if (targetUser == null) {
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }

            com.example.backend_Whiteboard.model.BoardMember member = boardMemberRepository
                    .findByBoardIdAndUserId(board.getId(), targetUser.getId()).orElse(null);
            if (member != null) {
                boardMemberRepository.delete(member);
                return ResponseEntity.ok(Map.of("message", "Member removed"));
            } else {
                return ResponseEntity.status(404).body(Map.of("error", "Member not found on this board"));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // GET /api/board/{id}/members
    @GetMapping("/{id}/members")
    public ResponseEntity<?> getBoardMembers(@PathVariable UUID id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            Board board = boardRepository.findById(id).orElse(null);
            if (board == null) {
                return ResponseEntity.status(404).body(Map.of("error", "Board not found"));
            }

            List<BoardMember> members = boardMemberRepository.findByBoardId(id);
            List<Map<String, String>> membersList = members.stream()
                    .map(m -> Map.of("username", m.getUser().getUsername(), "role", m.getRole()))
                    .toList();

            return ResponseEntity.ok(Map.of(
                    "owner", board.getOwner().getUsername(),
                    "members", membersList));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // POST /api/board/{id}/request-access
    @PostMapping("/{id}/request-access")
    public ResponseEntity<?> requestAccess(@PathVariable UUID id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            String token = authHeader.substring(7);
            UUID userId = jwtUtil.getUserIdFromToken(token);

            Board board = boardRepository.findById(id).orElse(null);
            if (board == null)
                return ResponseEntity.status(404).body(Map.of("error", "Board not found"));

            User user = userRepository.findById(userId).orElse(null);
            if (user == null)
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));

            // Check if already an owner or member
            if (board.getOwner().getId().equals(userId) ||
                    boardMemberRepository.findByBoardId(id).stream()
                            .anyMatch(m -> m.getUser().getId().equals(userId))) {
                return ResponseEntity.status(400).body(Map.of("error", "User already has access to this board"));
            }

            // Check if already requested
            if (permissionRequestRepository.existsByBoardIdAndUserId(id, userId)) {
                return ResponseEntity.status(400).body(Map.of("error", "Already requested"));
            }

            com.example.backend_Whiteboard.model.PermissionRequest req = new com.example.backend_Whiteboard.model.PermissionRequest(
                    board, user);
            permissionRequestRepository.save(req);

            return ResponseEntity.ok(Map.of("message", "Access requested successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // GET /api/board/{id}/requests
    @GetMapping("/{id}/requests")
    public ResponseEntity<?> getPendingRequests(@PathVariable UUID id,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            String token = authHeader.substring(7);
            UUID userId = jwtUtil.getUserIdFromToken(token);

            Board board = boardRepository.findById(id).orElse(null);
            if (board == null)
                return ResponseEntity.status(404).body(Map.of("error", "Board not found"));

            // Only owner can see requests
            if (!board.getOwner().getId().equals(userId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Only the owner can view access requests"));
            }

            List<com.example.backend_Whiteboard.model.PermissionRequest> requests = permissionRequestRepository
                    .findByBoardId(id);
            List<Map<String, Object>> pending = requests.stream()
                    .filter(r -> "PENDING".equals(r.getStatus()))
                    .map(r -> {
                        Map<String, Object> map = new java.util.HashMap<>();
                        map.put("id", r.getId());
                        map.put("username", r.getUser().getUsername());
                        map.put("userId", r.getUser().getId());
                        return map;
                    }).toList();

            return ResponseEntity.ok(pending);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // POST /api/board/{id}/requests/{requestId}/approve
    @PostMapping("/{id}/requests/{requestId}/approve")
    public ResponseEntity<?> approveRequest(@PathVariable UUID id, @PathVariable UUID requestId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            String token = authHeader.substring(7);
            UUID userId = jwtUtil.getUserIdFromToken(token);

            Board board = boardRepository.findById(id).orElse(null);
            if (board == null)
                return ResponseEntity.status(404).body(Map.of("error", "Board not found"));

            // Only owner can approve
            if (!board.getOwner().getId().equals(userId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Only the owner can approve access requests"));
            }

            com.example.backend_Whiteboard.model.PermissionRequest req = permissionRequestRepository.findById(requestId)
                    .orElse(null);
            if (req == null || !req.getBoard().getId().equals(id)) {
                return ResponseEntity.status(404).body(Map.of("error", "Request not found"));
            }

            req.setStatus("APPROVED");
            permissionRequestRepository.save(req);

            // Add user to board members
            if (boardMemberRepository.findByBoardId(id).stream()
                    .noneMatch(m -> m.getUser().getId().equals(req.getUser().getId()))) {
                BoardMember member = new BoardMember(board, req.getUser());
                boardMemberRepository.save(member);
            }

            return ResponseEntity.ok(Map.of("message", "Request approved", "username", req.getUser().getUsername()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // POST /api/board/{id}/requests/{requestId}/reject
    @PostMapping("/{id}/requests/{requestId}/reject")
    public ResponseEntity<?> rejectRequest(@PathVariable UUID id, @PathVariable UUID requestId,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        try {
            String token = authHeader.substring(7);
            UUID userId = jwtUtil.getUserIdFromToken(token);

            Board board = boardRepository.findById(id).orElse(null);
            if (board == null)
                return ResponseEntity.status(404).body(Map.of("error", "Board not found"));

            // Only owner can reject
            if (!board.getOwner().getId().equals(userId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Only the owner can reject access requests"));
            }

            com.example.backend_Whiteboard.model.PermissionRequest req = permissionRequestRepository.findById(requestId)
                    .orElse(null);
            if (req == null || !req.getBoard().getId().equals(id)) {
                return ResponseEntity.status(404).body(Map.of("error", "Request not found"));
            }

            req.setStatus("REJECTED");
            permissionRequestRepository.save(req);
            // Alternatively, could delete the request:
            // permissionRequestRepository.delete(req);

            return ResponseEntity.ok(Map.of("message", "Request rejected"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
