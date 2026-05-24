package com.example.backend_Whiteboard.repository;

import com.example.backend_Whiteboard.model.AIShape;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AIShapeRepository extends JpaRepository<AIShape, UUID> {

    List<AIShape> findByLabel(String label);

    Optional<AIShape> findBySampleId(String sampleId);

    boolean existsBySampleId(String sampleId);
}