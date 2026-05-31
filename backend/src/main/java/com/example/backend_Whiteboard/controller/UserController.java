package com.example.backend_Whiteboard.controller;

import com.example.backend_Whiteboard.config.JwtUtil;
import com.example.backend_Whiteboard.model.User;
import com.example.backend_Whiteboard.repository.BoardRepository;
import com.example.backend_Whiteboard.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private static final long MAX_AVATAR_BYTES = 5 * 1024 * 1024;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BoardRepository boardRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        Optional<User> userOpt = resolveUser(authHeader);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }
        return ResponseEntity.ok(toProfileResponse(userOpt.get()));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody Map<String, String> body) {
        Optional<User> userOpt = resolveUser(authHeader);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        User user = userOpt.get();
        String displayName = body.get("displayName");
        String email = body.get("email");

        if (displayName != null) {
            String trimmed = displayName.trim();
            if (trimmed.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Display name cannot be empty"));
            }
            if (trimmed.length() > 100) {
                return ResponseEntity.badRequest().body(Map.of("error", "Display name is too long"));
            }
            user.setDisplayName(trimmed);
        }

        if (email != null) {
            String trimmedEmail = email.trim();
            if (!trimmedEmail.isEmpty() && !trimmedEmail.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid email format"));
            }
            user.setEmail(trimmedEmail.isEmpty() ? null : trimmedEmail);
        }

        userRepository.save(user);
        return ResponseEntity.ok(toProfileResponse(user));
    }

    @PostMapping("/avatar")
    public ResponseEntity<?> uploadAvatar(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam("file") MultipartFile file) {
        Optional<User> userOpt = resolveUser(authHeader);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
        }

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file provided"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().body(Map.of("error", "File must be an image"));
        }

        if (file.getSize() > MAX_AVATAR_BYTES) {
            return ResponseEntity.badRequest().body(Map.of("error", "Image must be 5MB or smaller"));
        }

        User user = userOpt.get();
        String extension = switch (contentType) {
            case "image/png" -> "png";
            case "image/gif" -> "gif";
            case "image/webp" -> "webp";
            default -> "jpg";
        };

        try {
            Path avatarDir = Paths.get(uploadDir, "avatars").toAbsolutePath().normalize();
            Files.createDirectories(avatarDir);

            String filename = user.getId() + "." + extension;
            Path target = avatarDir.resolve(filename);
            Files.write(target, file.getBytes());

            String avatarUrl = "/uploads/avatars/" + filename;
            user.setAvatarUrl(avatarUrl);
            userRepository.save(user);

            return ResponseEntity.ok(Map.of(
                    "avatarUrl", avatarUrl,
                    "profile", toProfileResponse(user)));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to save avatar"));
        }
    }

    private Optional<User> resolveUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return Optional.empty();
        }
        String token = authHeader.substring(7);
        if (!jwtUtil.isValid(token)) {
            return Optional.empty();
        }
        UUID userId = jwtUtil.getUserIdFromToken(token);
        return userRepository.findById(userId);
    }

    private Map<String, Object> toProfileResponse(User user) {
        UUID userId = user.getId();
        long ownedBoards = boardRepository.countByOwnerId(userId);
        long sharedBoards = boardRepository.countSharedBoardsForUser(userId);

        return Map.of(
                "userId", userId.toString(),
                "username", user.getUsername(),
                "displayName", user.getDisplayName() != null ? user.getDisplayName() : user.getUsername(),
                "email", user.getEmail() != null ? user.getEmail() : "",
                "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : "",
                "createdAt", user.getCreatedAt().toString(),
                "ownedBoards", ownedBoards,
                "sharedBoards", sharedBoards);
    }
}
