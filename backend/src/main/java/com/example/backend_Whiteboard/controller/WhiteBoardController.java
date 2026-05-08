package com.example.backend_Whiteboard.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import com.example.backend_Whiteboard.model.Stroke;

@Controller
public class WhiteBoardController {
    @MessageMapping("/draw")
    @SendTo("/topic/drawing")
    public Stroke broadcastStroke(Stroke stroke) {
        return stroke;
    }

    @MessageMapping("/delete")
    @SendTo("/topic/delete")
    public java.util.Map<String, String> broadcastDelete(java.util.Map<String, String> payload) {
        return payload;
    }

    @MessageMapping("/note/create")
    @SendTo("/topic/note/create")
    public java.util.Map<String, Object> broadcastNoteCreate(java.util.Map<String, Object> payload) {
        return payload;
    }

    @MessageMapping("/note/update")
    @SendTo("/topic/note/update")
    public java.util.Map<String, Object> broadcastNoteUpdate(java.util.Map<String, Object> payload) {
        return payload;
    }

    @MessageMapping("/note/delete")
    @SendTo("/topic/note/delete")
    public java.util.Map<String, String> broadcastNoteDelete(java.util.Map<String, String> payload) {
        return payload;
    }
}
