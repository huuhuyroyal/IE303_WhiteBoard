package com.example.backend_Whiteboard.repository;

import com.example.backend_Whiteboard.model.Board;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface BoardRepository extends JpaRepository<Board, UUID> {
    List<Board> findAllByOrderByCreatedAtDesc();
    List<Board> findAllByOwnerIdOrderByCreatedAtDesc(UUID ownerId);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT b FROM Board b LEFT JOIN BoardMember bm ON bm.board = b WHERE b.owner.id = :userId OR bm.user.id = :userId ORDER BY b.createdAt DESC")
    List<Board> findAccessibleBoardsByUserId(@org.springframework.data.repository.query.Param("userId") UUID userId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(b) > 0 FROM Board b LEFT JOIN BoardMember bm ON bm.board = b WHERE b.id = :boardId AND (b.owner.id = :userId OR bm.user.id = :userId)")
    boolean hasAccessToBoard(@org.springframework.data.repository.query.Param("boardId") UUID boardId, @org.springframework.data.repository.query.Param("userId") UUID userId);

    long countByOwnerId(UUID ownerId);

    @org.springframework.data.jpa.repository.Query(
            "SELECT COUNT(DISTINCT b) FROM Board b JOIN BoardMember bm ON bm.board = b "
                    + "WHERE bm.user.id = :userId AND b.owner.id <> :userId")
    long countSharedBoardsForUser(@org.springframework.data.repository.query.Param("userId") UUID userId);
}
