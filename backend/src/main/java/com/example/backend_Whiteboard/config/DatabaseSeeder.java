package com.example.backend_Whiteboard.config;

import com.example.backend_Whiteboard.model.Board;
import com.example.backend_Whiteboard.model.BoardMember;
import com.example.backend_Whiteboard.model.User;
import com.example.backend_Whiteboard.repository.BoardMemberRepository;
import com.example.backend_Whiteboard.repository.BoardRepository;
import com.example.backend_Whiteboard.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;

import java.util.UUID;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final BoardRepository boardRepository;
    private final BoardMemberRepository boardMemberRepository;

    private UUID defaultUserId;
    private UUID defaultBoardId;

    @Value("${server.port:8080}")
    private String port;

    public DatabaseSeeder(UserRepository userRepository, BoardRepository boardRepository,
            BoardMemberRepository boardMemberRepository) {
        this.userRepository = userRepository;
        this.boardRepository = boardRepository;
        this.boardMemberRepository = boardMemberRepository;
    }

    @Override
    public void run(String... args) {
        User defaultUser = userRepository.findByUsername("default_user")
                .orElseGet(() -> {
                    User newUser = new User("default_user", "password123");
                    return userRepository.save(newUser);
                });

        this.defaultUserId = defaultUser.getId();

        if (boardRepository.count() == 0) {
            Board newBoard = new Board("Global Whiteboard", defaultUser);
            newBoard = boardRepository.save(newBoard);

            BoardMember member = new BoardMember(newBoard, defaultUser);
            boardMemberRepository.save(member);

            this.defaultBoardId = newBoard.getId();
        } else {
            // Just get the first board if it exists
            this.defaultBoardId = boardRepository.findAll().get(0).getId();
        }

        System.out.println("Backend is running on port " + port);
    }

    public UUID getDefaultUserId() {
        return defaultUserId;
    }

    public UUID getDefaultBoardId() {
        return defaultBoardId;
    }
}
