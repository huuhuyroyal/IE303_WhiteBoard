package com.example.backend_Whiteboard.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import com.example.backend_Whiteboard.service.CloudinaryService;
import org.springframework.beans.factory.annotation.Autowired;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/board/{boardId}/attachment")
public class BoardAttachmentController {

    private static final long MAX_IMAGE_BYTES = 15 * 1024 * 1024;
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp");

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Autowired
    private CloudinaryService cloudinaryService;

    @PostMapping
    public ResponseEntity<?> uploadAttachment(
            @PathVariable UUID boardId,
            @RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "No file provided"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType.toLowerCase())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Only image files are supported (JPEG, PNG, GIF, WebP)"));
        }

        if (file.getSize() > MAX_IMAGE_BYTES) {
            return ResponseEntity.badRequest().body(Map.of("error", "Image must be 15MB or smaller"));
        }

        try {
            String folder = "whiteboard_app/boards/" + boardId.toString();
            String url = cloudinaryService.uploadImage(file, folder);

            return ResponseEntity.ok(Map.of(
                    "url", url,
                    "mimeType", contentType,
                    "filename", file.getOriginalFilename() != null ? file.getOriginalFilename() : "image"));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to upload file to Cloudinary"));
        }
    }
}
