package com.transparencychain.backend.controller;

import com.transparencychain.backend.dto.SdgSuggestionResponse;
import com.transparencychain.backend.service.AiSdgSuggestionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/v1/ai")
public class AiController {

    @Autowired
    private AiSdgSuggestionService aiSdgSuggestionService;

    @PostMapping("/suggest-sdg")
    public ResponseEntity<SdgSuggestionResponse> suggestSdg(@RequestBody Map<String, String> payload) {
        String title = payload.get("title");
        String description = payload.get("description");
        String category = payload.get("category");

        SdgSuggestionResponse response = aiSdgSuggestionService.suggestSdgGoalAndTarget(title, description, category);
        return ResponseEntity.ok(response);
    }
}
