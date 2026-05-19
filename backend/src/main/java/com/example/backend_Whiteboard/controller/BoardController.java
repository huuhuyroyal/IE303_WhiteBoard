package com.example.backend_Whiteboard.controller;

import com.example.backend_Whiteboard.model.Board;
import com.example.backend_Whiteboard.model.User;
import com.example.backend_Whiteboard.model.BoardMember;
import com.example.backend_Whiteboard.repository.BoardRepository;
import com.example.backend_Whiteboard.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/board")
public class BoardController {

    @Autowired
    private BoardRepository boardRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private com.example.backend_Whiteboard.repository.BoardMemberRepository boardMemberRepository;

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
            if (board == null) return ResponseEntity.status(404).body(Map.of("error", "Board not found"));
            
            if (!board.getOwner().getId().equals(currentUserId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Only owner can share this board"));
            }

            // Tìm user cần share
            String targetUsername = body.get("username");
            if (targetUsername == null || targetUsername.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Target username is required"));
            }

            User targetUser = userRepository.findByUsername(targetUsername).orElse(null);
            if (targetUser == null) {
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }
            
            if (targetUser.getId().equals(currentUserId)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot share with yourself"));
            }

            // Thêm vào BoardMember (cần Autowire BoardMemberRepository)
            com.example.backend_Whiteboard.model.BoardMember member = new com.example.backend_Whiteboard.model.BoardMember(board, targetUser);
            boardMemberRepository.save(member);
            
            return ResponseEntity.ok(Map.of("message", "Board shared successfully with " + targetUsername));

        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Lỗi khi đã share rồi (unique constraint)
            return ResponseEntity.status(409).body(Map.of("error", "User is already a member of this board"));
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
            List<String> usernames = members.stream()
                    .map(m -> m.getUser().getUsername())
                    .toList();
            
            return ResponseEntity.ok(Map.of(
                "owner", board.getOwner().getUsername(),
                "members", usernames
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
