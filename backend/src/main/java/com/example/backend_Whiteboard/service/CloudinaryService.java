package com.example.backend_Whiteboard.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(@Value("${cloudinary.url}") String cloudinaryUrl) {
        this.cloudinary = new Cloudinary(cloudinaryUrl);
        this.cloudinary.config.secure = true;
    }

    public String uploadImage(MultipartFile file, String folderPath) throws IOException {
        // Here we specify the folder in Cloudinary!
        Map<String, Object> options = ObjectUtils.asMap(
                "folder", folderPath,
                "resource_type", "auto"
        );
        Map<?, ?> uploadResult = cloudinary.uploader().upload(file.getBytes(), options);
        return uploadResult.get("secure_url").toString();
    }

    public void deleteImage(String imageUrl) {
        try {
            if (imageUrl == null || !imageUrl.contains("cloudinary.com")) return;
            String[] parts = imageUrl.split("/upload/");
            if (parts.length < 2) return;
            String afterUpload = parts[1];
            if (afterUpload.matches("^v\\d+/.*")) {
                afterUpload = afterUpload.substring(afterUpload.indexOf("/") + 1);
            }
            int lastDot = afterUpload.lastIndexOf(".");
            if (lastDot != -1) {
                afterUpload = afterUpload.substring(0, lastDot);
            }
            cloudinary.uploader().destroy(afterUpload, ObjectUtils.emptyMap());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
