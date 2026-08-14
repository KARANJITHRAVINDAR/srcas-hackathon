package com.transparencychain.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class OpenRouterAiService {

    @Value("${openrouter.api.key:${OPENROUTER_API_KEY:}}")
    private String openRouterApiKey;

    private final String OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
    private final String MODEL_NAME = "meta-llama/llama-3.3-70b-instruct";
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public JsonNode callLlamaModel(String prompt) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + openRouterApiKey.trim());
            headers.set("HTTP-Referer", "http://localhost:8081");
            headers.set("X-Title", "Transparency Chain");

            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);

            Map<String, Object> body = new HashMap<>();
            body.put("model", MODEL_NAME);
            body.put("messages", Collections.singletonList(message));
            body.put("temperature", 0.3);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.exchange(OPENROUTER_URL, HttpMethod.POST, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode choices = root.path("choices");
                if (choices.isArray() && choices.size() > 0) {
                    String contentStr = choices.get(0).path("message").path("content").asText();
                    
                    // Extract JSON string from codeblock markdown if present
                    if (contentStr.contains("```json")) {
                        contentStr = contentStr.substring(contentStr.indexOf("```json") + 7);
                        if (contentStr.contains("```")) {
                            contentStr = contentStr.substring(0, contentStr.indexOf("```"));
                        }
                    } else if (contentStr.contains("```")) {
                        contentStr = contentStr.substring(contentStr.indexOf("```") + 3);
                        if (contentStr.contains("```")) {
                            contentStr = contentStr.substring(0, contentStr.indexOf("```"));
                        }
                    }
                    contentStr = contentStr.trim();
                    return objectMapper.readTree(contentStr);
                }
            }
        } catch (Exception e) {
            System.err.println("OpenRouter API call error: " + e.getMessage());
        }
        return null;
    }

    public List<Map<String, Object>> generateCustomMilestones(String title, String description, BigDecimal totalBudget, String duration, String sdgGoal) {
        String prompt = String.format(
            "You are an expert NGO project manager. Analyze this project:\n" +
            "Title: %s\n" +
            "Description: %s\n" +
            "Total Budget: INR %s\n" +
            "Duration: %s\n" +
            "SDG Goal: %s\n\n" +
            "Generate a realistic, specific 3 to 4 phase milestone breakdown customized specifically for this project. " +
            "Do NOT use generic names. Include concrete titles (e.g. 'Phase 1: Electricity Infrastructure Assessment', 'Phase 2: Installation of Electrical Panels').\n" +
            "CRITICAL ORDERING RULE:\n" +
            "The output 'milestones' JSON array MUST be strictly ordered in chronological sequence.\n" +
            "Item 0 MUST be sequenceNumber 1 with title starting with 'Phase 1: ...'.\n" +
            "Item 1 MUST be sequenceNumber 2 with title starting with 'Phase 2: ...'.\n" +
            "Item 2 MUST be sequenceNumber 3 with title starting with 'Phase 3: ...'.\n" +
            "Do NOT swap, shuffle, or put Phase 2 before Phase 1.\n\n" +
            "Return ONLY a JSON object with this format:\n" +
            "{\n" +
            "  \"milestones\": [\n" +
            "    {\n" +
            "      \"sequenceNumber\": 1,\n" +
            "      \"title\": \"Phase 1: Specific Name\",\n" +
            "      \"description\": \"Detailed action items and deliverables\",\n" +
            "      \"suggestedBudget\": 40000\n" +
            "    }\n" +
            "  ]\n" +
            "}\n" +
            "The sum of suggestedBudget across all milestones MUST EQUAL EXACTLY %s.",
            title != null ? title : "Community Project",
            description != null ? description : "Project for social good",
            totalBudget != null ? totalBudget.toPlainString() : "100000",
            duration != null ? duration : "6 months",
            sdgGoal != null ? sdgGoal : "SDG1",
            totalBudget != null ? totalBudget.toPlainString() : "100000"
        );

        JsonNode res = callLlamaModel(prompt);
        if (res != null && res.has("milestones") && res.get("milestones").isArray()) {
            List<Map<String, Object>> result = new ArrayList<>();
            JsonNode array = res.get("milestones");
            for (int i = 0; i < array.size(); i++) {
                JsonNode item = array.get(i);
                Map<String, Object> map = new HashMap<>();
                map.put("sequenceNumber", item.has("sequenceNumber") ? item.get("sequenceNumber").asInt() : (i + 1));
                map.put("title", item.has("title") ? item.get("title").asText() : "Phase " + (i + 1));
                map.put("description", item.has("description") ? item.get("description").asText() : "Phase deliverables");
                map.put("suggestedBudget", item.has("suggestedBudget") ? new BigDecimal(item.get("suggestedBudget").asText()) : BigDecimal.ZERO);
                result.add(map);
            }
            if (!result.isEmpty()) return result;
        }
        return null;
    }
}
