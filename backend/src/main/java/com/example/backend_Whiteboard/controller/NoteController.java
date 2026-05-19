package com.example.backend_Whiteboard.controller;

import com.example.backend_Whiteboard.model.Board;
import com.example.backend_Whiteboard.model.Note;
import com.example.backend_Whiteboard.model.User;
import com.example.backend_Whiteboard.repository.BoardRepository;
import com.example.backend_Whiteboard.repository.NoteRepository;
import com.example.backend_Whiteboard.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/board/{boardId}/note")
public class NoteController {

    @Autowired
    private NoteRepository noteRepository;
    @Autowired
    private BoardRepository boardRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private com.example.backend_Whiteboard.config.JwtUtil jwtUtil;

    // GET /api/board/{boardId}/note
    @GetMapping
    public ResponseEntity<List<Note>> getAllNotes(@PathVariable UUID boardId) {
        return ResponseEntity.ok(noteRepository.findByBoardIdOrderByCreatedAtAsc(boardId));
    }

    // POST /api/board/{boardId}/note
    @PostMapping
    public ResponseEntity<?> saveNote(@PathVariable UUID boardId, @RequestBody Note note,
                                      @RequestHeader(value = "Authorization", required = false) String authHeader) {
        try {
            Board board = boardRepository.findById(boardId).orElse(null);
            if (board == null)
                return ResponseEntity.notFound().build();
            note.setBoard(board);

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                UUID userId = jwtUtil.getUserIdFromToken(token);
                User user = userRepository.findById(userId).orElse(null);
                note.setUser(user);
            }
            return ResponseEntity.ok(noteRepository.save(note));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("ERROR: " + e.getMessage());
        }
    }

    // PUT /api/board/{boardId}/note/{id}
    @PutMapping("/{id}")
    public ResponseEntity<?> updateNote(@PathVariable UUID boardId, @PathVariable UUID id,
            @RequestBody Note updated) {
        return noteRepository.findById(id).map(existing -> {
            existing.setX(updated.getX());
            existing.setY(updated.getY());
            existing.setText(updated.getText());
            existing.setColorIndex(updated.getColorIndex());
            existing.setWidth(updated.getWidth());
            return ResponseEntity.<Object>ok(noteRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    // DELETE /api/board/{boardId}/note/{id}
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNote(@PathVariable UUID boardId, @PathVariable UUID id) {
        if (!noteRepository.existsById(id))
            return ResponseEntity.notFound().build();
        noteRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
