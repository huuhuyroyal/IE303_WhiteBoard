package com.example.backend_Whiteboard.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtUtil {

    private static final String SECRET = "co-canvas-super-secret-key-do-not-share-2026";
    private static final long EXPIRY_MS = 7 * 24 * 60 * 60 * 1000L;

    private final SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes());

    public String generateToken(UUID userId, String username) {
        return Jwts.builder()
                .subject(username)
                .claim("userId", userId.toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRY_MS))
                .signWith(key)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isValid(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public String getUsernameFromToken(String token) {
        return parseToken(token).getSubject();
    }

    public UUID getUserIdFromToken(String token) {
        return UUID.fromString(parseToken(token).get("userId", String.class));
    }
}
