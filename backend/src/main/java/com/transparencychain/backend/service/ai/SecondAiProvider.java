package com.transparencychain.backend.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.*;

@Service("secondAiProvider")
public class SecondAiProvider implements AiTextGenerationProvider {

    private static final Logger log = LoggerFactory.getLogger(SecondAiProvider.class);

    @Value("${SECOND_AI_PROVIDER_API_KEY:${fallback.ai.key:}}")
    private String apiKey;

    @Value("${SECOND_AI_PROVIDER_BASE_URL:${fallback.ai.base-url:https://openrouter.ai/api/v1/chat/completions}}")
    private String baseUrl;

    @Value("${SECOND_AI_PROVIDER_MODEL:${fallback.ai.model:deepseek/deepseek-chat}}")
    private String modelName;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public SecondAiProvider() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(8000);
        factory.setReadTimeout(10000);
        this.restTemplate = new RestTemplate(factory);
    }

    public SecondAiProvider(String apiKey, String baseUrl, String modelName) {
        this();
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.modelName = modelName;
    }

    @Override
    public String getProviderName() {
        return "FALLBACK_PROVIDER (" + (modelName != null ? modelName : "deepseek-chat") + ")";
    }

    @Override
    public boolean isAvailable() {
        return apiKey != null && !apiKey.trim().isBlank();
    }

    @Override
    public List<Map<String, Object>> generateCustomMilestones(
            String title, String description, BigDecimal totalBudget, String duration, String sdgGoal) {

        if (!isAvailable()) {
            return null;
        }

        try {
            String prompt = String.format(
                    "You are a fallback NGO milestone generation AI assistant. Analyze this project:\n" +
                            "Title: %s\nDescription: %s\nTotal Budget: INR %s\nDuration: %s\nSDG Goal: %s\n\n" +
                            "Generate a realistic, specific 3 to 4 phase milestone breakdown customized for this project.\n" +
                            "Return ONLY a valid JSON object:\n" +
                            "{\n" +
                            "  \"milestones\": [\n" +
                            "    {\n" +
                            "      \"sequenceNumber\": 1,\n" +
                            "      \"title\": \"Phase 1: Specific Name\",\n" +
                            "      \"description\": \"Actionable deliverables\",\n" +
                            "      \"suggestedBudget\": 40000\n" +
                            "    }\n" +
                            "  ]\n" +
                            "}\n" +
                            "The sum of suggestedBudget across all milestones MUST EQUAL EXACTLY %s.",
                    title != null ? title : "Project",
                    description != null ? description : "Community support project",
                    totalBudget != null ? totalBudget.toPlainString() : "100000",
                    duration != null ? duration : "6 months",
                    sdgGoal != null ? sdgGoal : "SDG1",
                    totalBudget != null ? totalBudget.toPlainString() : "100000"
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + apiKey.trim());
            headers.set("HTTP-Referer", "http://localhost:8081");
            headers.set("X-Title", "Transparency Chain Fallback");

            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);

            Map<String, Object> body = new HashMap<>();
            body.put("model", modelName != null && !modelName.isBlank() ? modelName : "deepseek/deepseek-chat");
            body.put("messages", Collections.singletonList(message));
            body.put("temperature", 0.1);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            String url = (baseUrl != null && !baseUrl.isBlank()) ? baseUrl : "https://openrouter.ai/api/v1/chat/completions";
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode choices = root.path("choices");
                if (choices.isArray() && choices.size() > 0) {
                    String contentStr = choices.get(0).path("message").path("content").asText();

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
                    JsonNode jsonRes = objectMapper.readTree(contentStr);

                    if (jsonRes.has("milestones") && jsonRes.get("milestones").isArray()) {
                        List<Map<String, Object>> result = new ArrayList<>();
                        JsonNode array = jsonRes.get("milestones");
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
                }
            }
        } catch (Exception e) {
            log.warn("[Second AI Provider Failure] error: {}", e.getMessage());
        }
        return null;
    }
}
