package com.example.backend_Whiteboard.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Configuration class to load environment variables from .env file.
 * Loads .env from project root before Spring Boot initializes.
 */
@Configuration
public class EnvConfig {
    
    static {
        // Load .env from project root before application starts
        // This runs in the static initializer, before Spring context loads
        loadDotEnv();
    }
    
    private static void loadDotEnv() {
        try {
            // Find .env file in different locations
            String[] possiblePaths = {"..", "."};
            Dotenv dotenv = null;
            
            for (String path : possiblePaths) {
                try {
                    dotenv = Dotenv.configure()
                            .directory(path)
                            .ignoreIfMissing()
                            .load();
                    
                    // Check if any environment variable was loaded
                    if (dotenv.get("DB_URL") != null) {
                        System.out.println("✅ Successfully loaded .env from: " + path);
                        loadEnvVariablesToSystem(dotenv);
                        return;
                    }
                } catch (Exception e) {
                    // Try next path
                }
            }
            
            System.out.println("⚠️ Warning: .env file not found. Using default values or system environment variables.");
            
        } catch (Exception e) {
            System.err.println("❌ Error loading .env file: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    private static void loadEnvVariablesToSystem(Dotenv dotenv) {
        // Set all dotenv variables as system properties
        // This makes them available to Spring Boot's property resolver
        dotenv.entries().forEach(entry -> {
            System.setProperty(entry.getKey(), entry.getValue());
        });
    }
}
