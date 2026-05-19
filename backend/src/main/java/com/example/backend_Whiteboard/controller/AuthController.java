package com.example.backend_Whiteboard.controller;

import com.example.backend_Whiteboard.config.JwtUtil;
import com.example.backend_Whiteboard.model.User;
import com.example.backend_Whiteboard.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtUtil jwtUtil;

    // POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        if (username == null || username.isBlank() || password == null || password.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "Username is required and password must be at least 6 characters"));
        }

        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Username already taken"));
        }

        // Hash password
        User user = new User(username, passwordEncoder.encode(password));
        userRepository.save(user);

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        return ResponseEntity.ok(Map.of(
                "token", token,
                "userId", user.getId().toString(),
                "username", user.getUsername()));
    }

    // POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid username or password"));
        }

        User user = userOpt.get();
        // Verify password hash
        if (!passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid username or password"));
        }

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        return ResponseEntity.ok(Map.of(
                "token", token,
                "userId", user.getId().toString(),
                "username", user.getUsername()));
    }

    // GET /api/auth/me
    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "No token provided"));
        }
        String token = authHeader.substring(7);
        if (!jwtUtil.isValid(token)) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid or expired token"));
        }
        return userRepository.findByUsername(jwtUtil.getUsernameFromToken(token))
                .<ResponseEntity<?>>map(u -> ResponseEntity.ok(Map.of(
                        "userId", u.getId().toString(),
                        "username", u.getUsername())))
                .orElse(ResponseEntity.status(404).body(Map.of("error", "User not found")));
    }
}
