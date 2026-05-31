package com.example.backend_Whiteboard.controller;

import com.example.backend_Whiteboard.config.JwtUtil;
import com.example.backend_Whiteboard.model.User;
import com.example.backend_Whiteboard.repository.UserRepository;
import com.example.backend_Whiteboard.service.EmailService;
import com.example.backend_Whiteboard.service.OtpService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtUtil jwtUtil;
    @Autowired
    private EmailService emailService;
    @Autowired
    private OtpService otpService;

    @Value("${google.client.id}")
    private String googleClientId;

    @PostMapping("/register-init")
    public ResponseEntity<?> registerInit(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String email = body.get("email");
        String password = body.get("password");

        if (username == null || username.isBlank() || email == null || email.isBlank() || password == null || password.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username, email, and a 6+ char password are required"));
        }

        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Username already taken"));
        }
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.status(409).body(Map.of("error", "Email already taken"));
        }

        String otp = otpService.generateAndStoreOtp(username, email, password);
        emailService.sendOtpEmail(email, otp);

        return ResponseEntity.ok(Map.of("message", "OTP sent to email"));
    }

    @PostMapping("/register-verify")
    public ResponseEntity<?> registerVerify(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp = body.get("otp");

        OtpService.OtpSession session = otpService.getSession(email);
        if (session == null || !session.otpCode.equals(otp)) {
            return ResponseEntity.status(400).body(Map.of("error", "Invalid or expired OTP"));
        }

        User user = new User(session.username, passwordEncoder.encode(session.password));
        user.setEmail(session.email);
        userRepository.save(user);

        otpService.removeSession(email);

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        return ResponseEntity.ok(Map.of(
                "token", token,
                "userId", user.getId().toString(),
                "username", user.getUsername(),
                "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : ""));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String loginId = body.get("username"); // can be email or username
        String password = body.get("password");

        Optional<User> userOpt = userRepository.findByUsernameOrEmail(loginId, loginId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid username/email or password"));
        }

        User user = userOpt.get();
        if (!passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid username/email or password"));
        }

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        return ResponseEntity.ok(Map.of(
                "token", token,
                "userId", user.getId().toString(),
                "username", user.getUsername(),
                "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : ""));
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) {
        String credential = body.get("credential");
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new GsonFactory())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(credential);
            if (idToken != null) {
                GoogleIdToken.Payload payload = idToken.getPayload();
                String email = payload.getEmail();
                String name = (String) payload.get("name");
                String pictureUrl = (String) payload.get("picture");

                Optional<User> userOpt = userRepository.findByEmail(email);
                User user;
                if (userOpt.isPresent()) {
                    user = userOpt.get();
                } else {
                    String username = email.split("@")[0] + "_" + UUID.randomUUID().toString().substring(0, 5);
                    user = new User(username, passwordEncoder.encode(UUID.randomUUID().toString()));
                    user.setEmail(email);
                    user.setDisplayName(name);
                    user.setAvatarUrl(pictureUrl);
                    userRepository.save(user);
                }

                String token = jwtUtil.generateToken(user.getId(), user.getUsername());
                return ResponseEntity.ok(Map.of(
                        "token", token,
                        "userId", user.getId().toString(),
                        "username", user.getUsername(),
                        "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : ""));
            } else {
                return ResponseEntity.status(401).body(Map.of("error", "Invalid Google ID token"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Google authentication failed"));
        }
    }

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
                        "username", u.getUsername(),
                        "avatarUrl", u.getAvatarUrl() != null ? u.getAvatarUrl() : "")))
                .orElse(ResponseEntity.status(404).body(Map.of("error", "User not found")));
    }

    @GetMapping("/users/search")
    public ResponseEntity<?> searchUsers(
            @RequestParam("q") String keyword,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "No token provided"));
        }
        if (!jwtUtil.isValid(authHeader.substring(7))) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid or expired token"));
        }
        
        if (keyword == null || keyword.trim().isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<User> users = userRepository.findByUsernameContainingIgnoreCase(keyword.trim());
        List<Map<String, String>> results = users.stream()
                .map(u -> Map.of("username", u.getUsername(), "userId", u.getId().toString()))
                .toList();

        return ResponseEntity.ok(results);
    }
}
