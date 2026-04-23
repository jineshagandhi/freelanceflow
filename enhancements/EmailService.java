package com.freelanceflow.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Date;

/**
 * Handles outbound email — currently used for signup OTP verification.
 * Reads SMTP config from application.properties (spring.mail.*).
 */
@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.mail.from}")
    private String fromAddress;

    @Value("${app.otp.expiry-minutes:15}")
    private int otpExpiryMinutes;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /** Generates a 6-digit numeric OTP. */
    public String generateOtp() {
        return String.format("%06d", random.nextInt(1_000_000));
    }

    /** Computes the OTP expiry timestamp (now + expiry-minutes). */
    public Date computeExpiry() {
        return new Date(System.currentTimeMillis() + otpExpiryMinutes * 60_000L);
    }

    public int getOtpExpiryMinutes() {
        return otpExpiryMinutes;
    }

    /**
     * Sends the OTP email. Throws if SMTP is misconfigured so the caller
     * can surface a useful error to the frontend instead of silently failing.
     */
    public void sendOtpEmail(String toEmail, String name, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject("Your FreelanceFlow verification code");
        message.setText(
            "Hi " + (name == null || name.isBlank() ? "there" : name) + ",\n\n" +
            "Welcome to FreelanceFlow! Use the code below to verify your email:\n\n" +
            "    " + otp + "\n\n" +
            "This code expires in " + otpExpiryMinutes + " minutes.\n\n" +
            "If you did not sign up for FreelanceFlow, you can safely ignore this email.\n\n" +
            "— FreelanceFlow"
        );
        mailSender.send(message);
        System.out.println(">>> OTP email sent to " + toEmail);
    }
}
