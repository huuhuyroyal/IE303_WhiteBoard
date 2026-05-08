package com.example.backend_Whiteboard.repository;

import com.example.backend_Whiteboard.model.Note;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NoteRepository extends JpaRepository<Note, UUID> {
    List<Note> findByBoardIdOrderByCreatedAtAsc(UUID boardId);
}
