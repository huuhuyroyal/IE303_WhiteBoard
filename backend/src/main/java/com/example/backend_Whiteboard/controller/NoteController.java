package com.example.backend_Whiteboard.controller;

import com.example.backend_Whiteboard.config.DatabaseSeeder;
import com.example.backend_Whiteboard.model.Board;
import com.example.backend_Whiteboard.model.NoteEntity;
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
@RequestMapping("/api/notes")
public class NoteController {

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private DatabaseSeeder seeder;

    @Autowired
    private BoardRepository boardRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<NoteEntity>> getAllNotes() {
        if (seeder.getDefaultBoardId() == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(noteRepository.findByBoardIdOrderByCreatedAtAsc(seeder.getDefaultBoardId()));
    }

    @PostMapping
    public ResponseEntity<?> saveNote(@RequestBody NoteEntity note) {
        try {
            if (note.getBoard() == null && seeder.getDefaultBoardId() != null) {
                Board defaultBoard = boardRepository.findById(seeder.getDefaultBoardId()).orElse(null);
                note.setBoard(defaultBoard);
            }
            if (note.getUser() == null && seeder.getDefaultUserId() != null) {
                User defaultUser = userRepository.findById(seeder.getDefaultUserId()).orElse(null);
                note.setUser(defaultUser);
            }
            NoteEntity saved = noteRepository.save(note);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("LỖI: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateNote(@PathVariable UUID id, @RequestBody NoteEntity updated) {
        try {
            return noteRepository.findById(id).map(existing -> {
                existing.setX(updated.getX());
                existing.setY(updated.getY());
                existing.setText(updated.getText());
                existing.setColorIndex(updated.getColorIndex());
                existing.setWidth(updated.getWidth());
                return ResponseEntity.ok((Object) noteRepository.save(existing));
            }).orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("LỖI CẬP NHẬT: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNote(@PathVariable UUID id) {
        try {
            if (noteRepository.existsById(id)) {
                noteRepository.deleteById(id);
                return ResponseEntity.ok().build();
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("LỖI XÓA: " + e.getMessage());
        }
    }
}
