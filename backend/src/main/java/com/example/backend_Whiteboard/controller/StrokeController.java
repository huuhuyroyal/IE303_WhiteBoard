package com.example.backend_Whiteboard.controller;

import com.example.backend_Whiteboard.config.DatabaseSeeder;
import com.example.backend_Whiteboard.model.Board;
import com.example.backend_Whiteboard.model.StrokeEntity;
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
@RequestMapping("/api/drawings")
public class StrokeController {

    @Autowired
    private StrokeRepository strokeRepository;

    @Autowired
    private DatabaseSeeder seeder;

    @Autowired
    private BoardRepository boardRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<StrokeEntity>> getAllDrawings() {
        // Mock: just return all strokes for the default board
        if (seeder.getDefaultBoardId() == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(strokeRepository.findByBoardIdOrderByCreatedAtAsc(seeder.getDefaultBoardId()));
    }

    @PostMapping
    public ResponseEntity<?> saveDrawing(@RequestBody StrokeEntity stroke) {
        try {
            // Mock: assign default board and user if missing
            if (stroke.getBoard() == null && seeder.getDefaultBoardId() != null) {
                Board defaultBoard = boardRepository.findById(seeder.getDefaultBoardId()).orElse(null);
                stroke.setBoard(defaultBoard);
            }
            if (stroke.getUser() == null && seeder.getDefaultUserId() != null) {
                User defaultUser = userRepository.findById(seeder.getDefaultUserId()).orElse(null);
                stroke.setUser(defaultUser);
            }

            StrokeEntity saved = strokeRepository.save(stroke);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("LỖI: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDrawing(@PathVariable String id) {
        try {
            if (strokeRepository.existsById(UUID.fromString(id))) {
                strokeRepository.deleteById(UUID.fromString(id));
                return ResponseEntity.ok().build();
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("LỖI XÓA: " + e.getMessage());
        }
    }
}
