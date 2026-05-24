package com.example.backend_Whiteboard.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ai_shapes")
public class AIShape {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String label;

    @Column(name = "sample_name", nullable = false, unique = true)
    private String sampleId;

    @Column(name = "svg_url", nullable = false)
    private String svgUrl;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    public AIShape() {
    }

    public UUID getId() {
        return id;
    }

    public String getLabel() {
        return label;
    }

    public String getSampleId() {
        return sampleId;
    }

    public String getSvgUrl() {
        return svgUrl;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setSampleId(String sampleId) {
        this.sampleId = sampleId;
    }

    public void setSvgUrl(String svgUrl) {
        this.svgUrl = svgUrl;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}