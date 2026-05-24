package com.example.backend_Whiteboard.config;

import com.example.backend_Whiteboard.model.AIShape;
import com.example.backend_Whiteboard.repository.AIShapeRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.InputStream;
import java.util.Iterator;
import java.util.Map;

@Configuration
public class AIShapeDataImportConfig {

    @Bean
    CommandLineRunner importAIShapes(AIShapeRepository repository) {
        return args -> {
            if (repository.count() > 0) {
                System.out.println("AI Shapes is imported.");
                return;
            }

            ObjectMapper mapper = new ObjectMapper();
            InputStream inputStream = new ClassPathResource("ai.json").getInputStream();
            JsonNode rootNode = mapper.readTree(inputStream);

            Iterator<Map.Entry<String, JsonNode>> fields = rootNode.fields();
            int imported = 0;

            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> field = fields.next();

                String label = field.getKey();
                JsonNode samples = field.getValue();

                if (!samples.isArray()) {
                    continue;
                }

                for (JsonNode sample : samples) {
                    String sampleId = sample.path("sampleId").asText(null);

                    if (sampleId == null || sampleId.isBlank()) {
                        continue;
                    }

                    AIShape aiShape = new AIShape();
                    aiShape.setLabel(label);
                    aiShape.setSampleId(sampleId);
                    aiShape.setSvgUrl(sample.path("svgUrl").asText(""));

                    repository.save(aiShape);
                    imported++;
                }
            }

            System.out.println("Imported AI shapes: " + imported);
        };
    }
}
