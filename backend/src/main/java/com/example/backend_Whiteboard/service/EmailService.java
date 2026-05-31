package com.example.backend_Whiteboard.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendOtpEmail(String toEmail, String otpCode) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom("huydrobui05@gmail.com");
        message.setTo(toEmail);
        message.setSubject("Mã OTP Đăng ký Whiteboard");
        message.setText("Chào bạn,\n\nMã OTP để đăng ký tài khoản của bạn là: " + otpCode + "\n\nMã này sẽ hết hạn trong 5 phút.\n\nTrân trọng,\nĐội ngũ Whiteboard");
        
        mailSender.send(message);
    }
}
