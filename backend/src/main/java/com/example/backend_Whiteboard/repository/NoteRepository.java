package com.example.backend_Whiteboard.repository;

import com.example.backend_Whiteboard.model.NoteEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NoteRepository extends JpaRepository<NoteEntity, UUID> {
    List<NoteEntity> findByBoardIdOrderByCreatedAtAsc(UUID boardId);
}
