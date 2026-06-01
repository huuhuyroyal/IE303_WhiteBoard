package com.example.backend_Whiteboard.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Random;

@Service
public class OtpService {

    public static class OtpSession {
        public String username;
        public String email;
        public String password;
        public String otpCode;
        public long expirationTime;

        public OtpSession(String username, String email, String password, String otpCode) {
            this.username = username;
            this.email = email;
            this.password = password;
            this.otpCode = otpCode;
            this.expirationTime = System.currentTimeMillis() + 5 * 60 * 1000; // 5 minutes
        }
    }

    private final Map<String, OtpSession> otpStorage = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public String generateAndStoreOtp(String username, String email, String password) {
        // Generate 6-digit OTP
        String otp = String.format("%06d", random.nextInt(1000000));
        
        // Store session mapped by email
        OtpSession session = new OtpSession(username, email, password, otp);
        otpStorage.put(email, session);
        
        return otp;
    }

    public OtpSession getSession(String email) {
        OtpSession session = otpStorage.get(email);
        if (session != null) {
            if (System.currentTimeMillis() > session.expirationTime) {
                otpStorage.remove(email);
                return null;
            }
        }
        return session;
    }

    public void removeSession(String email) {
        otpStorage.remove(email);
    }
}
