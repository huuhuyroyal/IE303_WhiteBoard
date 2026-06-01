package com.example.backend_Whiteboard.controller;

import com.example.backend_Whiteboard.model.Note;
import com.example.backend_Whiteboard.repository.NoteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/board/{boardId}/chat")
public class AiChatController {

    @Autowired
    private NoteRepository noteRepository;

    @Autowired
    private com.example.backend_Whiteboard.repository.StrokeRepository strokeRepository;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent}")
    private String geminiApiUrl;

    private final WebClient webClient = WebClient.create();

    @PostMapping
    public ResponseEntity<?> chatWithBoard(@PathVariable UUID boardId, @RequestBody Map<String, String> request) {
        String userMessage = request.get("message");

        // Get data from sticky notes
        List<Note> notes = noteRepository.findByBoardIdOrderByCreatedAtAsc(boardId);
        String boardContent = notes.stream()
                .map(n -> "Notes(" + n.getColorIndex() + "): " + n.getText())
                .collect(Collectors.joining(" | "));

        if (boardContent.isEmpty()) {
            boardContent = "There is no Sticky Notes. ";
        } else {
            boardContent = "Notes: " + boardContent + ". ";
        }

        // Get data from shapes
        List<com.example.backend_Whiteboard.model.Stroke> strokes = strokeRepository
                .findByBoardIdOrderByCreatedAtAsc(boardId);

        long totalStrokes = strokes.size();

        if (!strokes.isEmpty()) {
            long starCount = strokes.stream()
                    .filter(s -> s.getMetadata() != null && "star".equals(s.getMetadata().get("type"))).count();
            long pencilCount = strokes.stream()
                    .filter(s -> s.getMetadata() != null && ("pencil".equals(s.getMetadata().get("type"))
                            || "path".equals(s.getMetadata().get("type"))))
                    .count();
            long rectangleCount = strokes.stream()
                    .filter(s -> s.getMetadata() != null && "rectangle".equals(s.getMetadata().get("type"))).count();
            long circleCount = strokes.stream()
                    .filter(s -> s.getMetadata() != null && "circle".equals(s.getMetadata().get("type"))).count();

            // Build shapes description
            StringBuilder shapeDesc = new StringBuilder();
            if (starCount > 0)
                shapeDesc.append(starCount).append(" star shape, ");
            if (rectangleCount > 0)
                shapeDesc.append(rectangleCount).append(" rectangle shape, ");
            if (circleCount > 0)
                shapeDesc.append(circleCount).append(" circle shape, ");
            if (pencilCount > 0)
                shapeDesc.append(pencilCount).append(" nét vẽ tay tự do, ");

            boardContent += "\nNgoài ra người dùng còn vẽ tổng cộng " + totalStrokes + " nét/hình vẽ trên bảng (gồm: "
                    + shapeDesc.toString() + "v.v...)";
        }

        // 2. TẠO PROMPT
        String systemPrompt = "You are a smart AI assistant for the Whiteboard application. Below is the content on the user's board: ["
                + boardContent + "]. \n" +
                "User asked: " + userMessage + "\n" +
                "Respond briefly and intelligently based on the content of the board. Only use plain text.";

        // Call Gemini API
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", systemPrompt)))));

        try {
            String aiResponseJson = webClient.post()
                    .uri(geminiApiUrl + "?key=" + geminiApiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode rootNode = mapper.readTree(aiResponseJson);

            String reply = "No response from AI";
            if (rootNode.has("candidates") && rootNode.get("candidates").isArray()
                    && rootNode.get("candidates").size() > 0) {
                com.fasterxml.jackson.databind.JsonNode candidate = rootNode.get("candidates").get(0);
                if (candidate.has("content") && candidate.get("content").has("parts")
                        && candidate.get("content").get("parts").isArray()
                        && candidate.get("content").get("parts").size() > 0) {
                    reply = candidate.get("content").get("parts").get(0).get("text").asText();
                    reply = reply.replace("**", "");
                }
            }

            return ResponseEntity.ok(Map.of("reply", reply));
        } catch (org.springframework.web.reactive.function.client.WebClientResponseException e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "AI Server Error: " + e.getResponseBodyAsString()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Internal Error: " + e.getMessage()));
        }
    }
}
