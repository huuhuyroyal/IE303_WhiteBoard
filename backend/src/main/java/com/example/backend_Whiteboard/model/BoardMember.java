package com.example.backend_Whiteboard.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "board_members", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"board_id", "user_id"})
})
public class BoardMember {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "board_id", nullable = false)
    private Board board;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "joined_at", columnDefinition = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
    private LocalDateTime joinedAt = LocalDateTime.now();

    @Column(name = "role", length = 20, columnDefinition = "VARCHAR(20) DEFAULT 'EDITOR'")
    private String role = "EDITOR"; // Default to EDITOR for backward compatibility

    public BoardMember() {}

    public BoardMember(Board board, User user) {
        this.board = board;
        this.user = user;
        this.role = "EDITOR";
    }
    
    public BoardMember(Board board, User user, String role) {
        this.board = board;
        this.user = user;
        this.role = role != null ? role : "EDITOR";
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Board getBoard() { return board; }
    public void setBoard(Board board) { this.board = board; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public LocalDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(LocalDateTime joinedAt) { this.joinedAt = joinedAt; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}
