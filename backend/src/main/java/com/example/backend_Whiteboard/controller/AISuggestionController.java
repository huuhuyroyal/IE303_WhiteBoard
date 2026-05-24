package com.example.backend_Whiteboard.controller;

import com.example.backend_Whiteboard.model.AIShape;
import com.example.backend_Whiteboard.repository.AIShapeRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import tools.jackson.databind.JsonNode;

import java.util.*;

@RestController
@RequestMapping("/api/board/{boardId}/ai-suggest")
public class AISuggestionController {

    private final AIShapeRepository aiShapeRepository;

    private final WebClient webClient = WebClient.builder()
            .baseUrl("https://inputtools.google.com")
            .build();

    public AISuggestionController(AIShapeRepository aiShapeRepository) {
        this.aiShapeRepository = aiShapeRepository;
    }

    /**
     * ENDPOINT 1:
     * Nhận nét vẽ thô từ frontend -> gọi Google InputTools để đoán label
     * -> lấy danh sách SVG mẫu theo label -> trả options về frontend
     */
    @PostMapping
    public ResponseEntity<?> suggest(
            @PathVariable UUID boardId,
            @RequestBody JsonNode requestBody) {
        try {
            JsonNode strokesNode = requestBody.get("strokes");
            JsonNode bboxNode = requestBody.get("bbox");

            if (strokesNode == null || !strokesNode.isArray()) {
                return ResponseEntity.badRequest().body("Missing or invalid strokes");
            }

            List<List<List<Double>>> inkData = convertStrokesToGoogleInk(strokesNode);
            List<String> labels = callGoogleInputTools(inkData);

            if (labels.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "label", "",
                        "labels", labels,
                        "bbox", bboxNode,
                        "options", Collections.emptyList()));
            }

            String selectedLabel = null;
            List<AIShape> options = new ArrayList<>();

            for (String label : labels) {
                List<AIShape> shapes = aiShapeRepository.findByLabel(label);
                if (shapes != null && !shapes.isEmpty()) {
                    selectedLabel = label;
                    options = shapes;
                    break;
                }
            }

            if (selectedLabel == null) {
                return ResponseEntity.ok(Map.of(
                        "label", "",
                        "labels", labels,
                        "bbox", bboxNode,
                        "options", Collections.emptyList()));
            }

            List<Map<String, Object>> optionDtos = options.stream()
                    .map(shape -> {
                        Map<String, Object> item = new HashMap<>();
                        item.put("sampleId", shape.getSampleId());
                        item.put("label", shape.getLabel());
                        item.put("svgUrl", shape.getSvgUrl());
                        return item;
                    })
                    .toList();

            Map<String, Object> response = new HashMap<>();
            response.put("label", selectedLabel);
            response.put("labels", labels);
            response.put("bbox", bboxNode);
            response.put("options", optionDtos);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Lỗi AI suggest: " + e.getMessage());
        }
    }

    /**
     * ENDPOINT 2:
     * Khi user chọn một SVG mẫu -> trả về svgUrl để frontend render
     */
    @PostMapping("/apply")
    public ResponseEntity<?> apply(
            @PathVariable UUID boardId,
            @RequestBody JsonNode requestBody) {
        try {
            String sampleId = requestBody.path("sampleId").asText();

            if (sampleId == null || sampleId.isBlank()) {
                return ResponseEntity.badRequest().body("Missing sampleId");
            }

            Optional<AIShape> shapeOpt = aiShapeRepository.findBySampleId(sampleId);

            if (shapeOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            AIShape shape = shapeOpt.get();

            return ResponseEntity.ok(Map.of(
                    "sampleId", shape.getSampleId(),
                    "label", shape.getLabel(),
                    "svgUrl", shape.getSvgUrl()));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Lỗi apply: " + e.getMessage());
        }
    }

    private List<List<List<Double>>> convertStrokesToGoogleInk(JsonNode strokesNode) {
        List<List<List<Double>>> inkData = new ArrayList<>();

        for (JsonNode stroke : strokesNode) {
            JsonNode pointsNode = stroke.get("points");
            if (pointsNode == null || !pointsNode.isArray())
                continue;

            List<Double> xCoords = new ArrayList<>();
            List<Double> yCoords = new ArrayList<>();

            for (JsonNode point : pointsNode) {
                xCoords.add(point.path("x").asDouble());
                yCoords.add(point.path("y").asDouble());
            }

            if (!xCoords.isEmpty()) {
                List<List<Double>> singleStroke = new ArrayList<>();
                singleStroke.add(xCoords);
                singleStroke.add(yCoords);
                inkData.add(singleStroke);
            }
        }

        return inkData;
    }

    @SuppressWarnings("unchecked")
    private List<String> callGoogleInputTools(List<List<List<Double>>> inkData) {
        if (inkData == null || inkData.isEmpty())
            return Collections.emptyList();

        Map<String, Object> body = Map.of(
                "input_type", 0,
                "requests", List.of(Map.of("ink", inkData, "language", "autodraw")));

        try {
            List<?> response = webClient.post()
                    .uri("/request?ime=handwriting&app=autodraw&cs=1&oe=UTF-8")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(List.class)
                    .block();

            if (response != null && !response.isEmpty() && "SUCCESS".equals(response.get(0))) {
                List<?> resultWrapper = (List<?>) response.get(1);
                List<?> firstResult = (List<?>) resultWrapper.get(0);
                return (List<String>) firstResult.get(1);
            }
        } catch (Exception e) {
            System.err.println("Lỗi gọi Google InputTools: " + e.getMessage());
        }

        return Collections.emptyList();
    }
}
