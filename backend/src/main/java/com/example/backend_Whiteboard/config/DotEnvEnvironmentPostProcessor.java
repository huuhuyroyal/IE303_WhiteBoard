package com.example.backend_Whiteboard.config;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

/**
 * Spring EnvironmentPostProcessor to load .env file variables into Spring Environment.
 * This runs after Spring boot initializes the environment but before beans are created.
 */
public class DotEnvEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        try {
            // Load .env from different possible locations
            Dotenv dotenv = null;
            String[] possiblePaths = {"..", "."};
            
            for (String path : possiblePaths) {
                try {
                    Dotenv temp = Dotenv.configure()
                            .directory(path)
                            .ignoreIfMissing()
                            .load();
                    
                    if (temp.get("DB_URL") != null) {
                        dotenv = temp;
                        System.out.println("✅ Successfully loaded .env from: " + path);
                        break;
                    }
                } catch (Exception e) {
                    // Continue to next path
                }
            }
            
            if (dotenv != null && !dotenv.entries().isEmpty()) {
                // Convert dotenv to Map and add to Spring Environment
                Map<String, Object> properties = new HashMap<>();
                dotenv.entries().forEach(entry -> {
                    properties.put(entry.getKey(), entry.getValue());
                    System.out.println("  → " + entry.getKey());
                });
                
                // Add as highest priority property source
                environment.getPropertySources().addFirst(
                        new MapPropertySource("dotenv", properties)
                );
            } else {
                System.out.println("⚠️ Warning: .env file not found or empty. Using system environment or defaults.");
            }
            
        } catch (Exception e) {
            System.err.println("❌ Error loading .env file: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
