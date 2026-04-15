package com.freelanceflow.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.freelanceflow")  // ← add this
public class FreelanceflowApplication {
    public static void main(String[] args) {
        SpringApplication.run(FreelanceflowApplication.class, args);
    }
}