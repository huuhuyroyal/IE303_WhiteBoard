package com.example.backend_Whiteboard.repository;

import com.example.backend_Whiteboard.model.BoardMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

import java.util.List;

public interface BoardMemberRepository extends JpaRepository<BoardMember, UUID> {
    List<BoardMember> findByBoardId(UUID boardId);
}
