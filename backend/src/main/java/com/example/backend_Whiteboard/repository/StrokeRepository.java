package com.example.backend_Whiteboard.repository;

import com.example.backend_Whiteboard.model.StrokeEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface StrokeRepository extends JpaRepository<StrokeEntity, UUID> {
    List<StrokeEntity> findByBoardIdOrderByCreatedAtAsc(UUID boardId);
}
