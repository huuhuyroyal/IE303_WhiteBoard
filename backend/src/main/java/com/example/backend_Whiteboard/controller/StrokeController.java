package com.example.backend_Whiteboard.controller;

import com.example.backend_Whiteboard.model.Board;
import com.example.backend_Whiteboard.model.Stroke;
import com.example.backend_Whiteboard.model.User;
import com.example.backend_Whiteboard.repository.BoardRepository;
import com.example.backend_Whiteboard.repository.StrokeRepository;
import com.example.backend_Whiteboard.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/board/{boardId}/stroke")
public class StrokeController {

    @Autowired
    private StrokeRepository strokeRepository;
    @Autowired
    private BoardRepository boardRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private com.example.backend_Whiteboard.config.JwtUtil jwtUtil;

    // GET /api/board/{boardId}/stroke
    @GetMapping
    public ResponseEntity<List<Stroke>> getAllStrokes(@PathVariable UUID boardId) {
        return ResponseEntity.ok(strokeRepository.findByBoardIdOrderByCreatedAtAsc(boardId));
    }

    // POST /api/board/{boardId}/stroke
    @PostMapping
    public ResponseEntity<?> saveStroke(@PathVariable UUID boardId, @RequestBody Stroke stroke,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Board board = boardRepository.findById(boardId).orElse(null);
            if (board == null)
                return ResponseEntity.notFound().build();
            stroke.setBoard(board);

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                UUID userId = jwtUtil.getUserIdFromToken(token);
                User user = userRepository.findById(userId).orElse(null);
                stroke.setUser(user);
            }
            return ResponseEntity.ok(strokeRepository.save(stroke));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("ERROR: " + e.getMessage());
        }
    }

    // PUT /api/board/{boardId}/stroke/{id}
    @PutMapping("/{id}")
    public ResponseEntity<?> updateStroke(
            @PathVariable UUID boardId,
            @PathVariable UUID id,
            @RequestBody Stroke updatedStroke,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Board board = boardRepository.findById(boardId).orElse(null);
            if (board == null) {
                return ResponseEntity.notFound().build();
            }

            return strokeRepository.findById(id).map(existing -> {
                existing.setBoard(board);
                existing.setColor(updatedStroke.getColor());
                existing.setWidth(updatedStroke.getWidth());
                existing.setPoints(updatedStroke.getPoints());
                existing.setMetadata(updatedStroke.getMetadata());

                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    String token = authHeader.substring(7);
                    UUID userId = jwtUtil.getUserIdFromToken(token);
                    User user = userRepository.findById(userId).orElse(null);
                    existing.setUser(user);
                }

                Stroke saved = strokeRepository.save(existing);
                return ResponseEntity.ok(saved);
            }).orElse(ResponseEntity.notFound().build());

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("ERROR UPDATE STROKE: " + e.getMessage());
        }
    }

    // DELETE /api/board/{boardId}/stroke/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteStroke(@PathVariable UUID boardId, @PathVariable UUID id) {
        if (!strokeRepository.existsById(id))
            return ResponseEntity.notFound().build();
        strokeRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
