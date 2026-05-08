package com.example.backend_Whiteboard.repository;

import com.example.backend_Whiteboard.model.Board;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface BoardRepository extends JpaRepository<Board, UUID> {
}
