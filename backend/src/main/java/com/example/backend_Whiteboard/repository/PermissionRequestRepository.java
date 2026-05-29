package com.example.backend_Whiteboard.repository;

import com.example.backend_Whiteboard.model.PermissionRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PermissionRequestRepository extends JpaRepository<PermissionRequest, UUID> {
    List<PermissionRequest> findByBoardId(UUID boardId);
    boolean existsByBoardIdAndUserId(UUID boardId, UUID userId);
}
