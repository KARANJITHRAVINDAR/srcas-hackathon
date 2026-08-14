package com.transparencychain.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.transparencychain.backend.dto.SdgSuggestionResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class AiSdgSuggestionService {

    @Autowired
    private OpenRouterAiService openRouterAiService;

    public SdgSuggestionResponse suggestSdgGoalAndTarget(String title, String description, String category) {
        try {
            String prompt = String.format(
                "You are an AI expert on UN Sustainable Development Goals (SDGs).\n" +
                "Project Title: %s\n" +
                "Description: %s\n" +
                "Category: %s\n\n" +
                "Analyze this project and select the single best UN SDG Goal (e.g. 'SDG6', 'SDG4', 'SDG3', etc.) and specific targets (e.g. ['6.1', '6.b']).\n" +
                "Return ONLY a JSON object formatted as:\n" +
                "{\n" +
                "  \"sdgGoal\": \"SDG6\",\n" +
                "  \"sdgTargets\": [\"6.1\", \"6.b\"],\n" +
                "  \"confidence\": 0.95,\n" +
                "  \"reasoning\": \"Clear 1-sentence reasoning\"\n" +
                "}",
                title != null ? title : "",
                description != null ? description : "",
                category != null ? category : ""
            );

            JsonNode res = openRouterAiService.callLlamaModel(prompt);
            if (res != null && res.has("sdgGoal")) {
                List<String> targets = new ArrayList<>();
                if (res.has("sdgTargets") && res.get("sdgTargets").isArray()) {
                    for (JsonNode t : res.get("sdgTargets")) {
                        targets.add(t.asText());
                    }
                }
                return new SdgSuggestionResponse(
                    res.get("sdgGoal").asText(),
                    targets,
                    res.has("confidence") ? res.get("confidence").asDouble() : 0.95,
                    res.has("reasoning") ? res.get("reasoning").asText() : "AI analyzed project title and description against UN SDG framework."
                );
            }
        } catch (Exception e) {
            System.err.println("OpenRouter SDG suggestion error: " + e.getMessage());
        }

        // Rule-based fallback
        String combined = ((title != null ? title : "") + " " + (description != null ? description : "") + " " + (category != null ? category : "")).toLowerCase();

        if (combined.contains("water") || combined.contains("pump") || combined.contains("irrigation") || combined.contains("well") || combined.contains("sanitation") || combined.contains("hygiene")) {
            return new SdgSuggestionResponse(
                "SDG6", 
                Arrays.asList("6.1", "6.b"), 
                0.94, 
                "Project description highlights drinking water access, agricultural irrigation, or sanitation infrastructure."
            );
        }

        if (combined.contains("solar") || combined.contains("energy") || combined.contains("renewable") || combined.contains("electricity") || combined.contains("power")) {
            return new SdgSuggestionResponse(
                "SDG7", 
                Arrays.asList("7.1", "7.2"), 
                0.92, 
                "Initiative focuses on clean energy, solar installations, or renewable power generation."
            );
        }

        if (combined.contains("school") || combined.contains("education") || combined.contains("literacy") || combined.contains("teacher") || combined.contains("student") || combined.contains("classroom") || combined.contains("learning")) {
            return new SdgSuggestionResponse(
                "SDG4", 
                Arrays.asList("4.1", "4.4"), 
                0.95, 
                "Focuses on educational access, school infrastructure, or youth skills development."
            );
        }

        if (combined.contains("health") || combined.contains("medical") || combined.contains("hospital") || combined.contains("clinic") || combined.contains("vaccine") || combined.contains("disease") || combined.contains("doctor")) {
            return new SdgSuggestionResponse(
                "SDG3", 
                Arrays.asList("3.1", "3.8"), 
                0.93, 
                "Directly impacts public health, healthcare delivery, or medical infrastructure."
            );
        }

        if (combined.contains("food") || combined.contains("hunger") || combined.contains("farm") || combined.contains("agriculture") || combined.contains("crop") || combined.contains("nutrition") || combined.contains("meal")) {
            return new SdgSuggestionResponse(
                "SDG2", 
                Arrays.asList("2.1", "2.3"), 
                0.91, 
                "Targeted at eliminating hunger, agricultural productivity, and community food security."
            );
        }

        if (combined.contains("women") || combined.contains("gender") || combined.contains("girl") || combined.contains("female") || combined.contains("mother")) {
            return new SdgSuggestionResponse(
                "SDG5", 
                Arrays.asList("5.1", "5.5"), 
                0.90, 
                "Promotes gender equality, female empowerment, or women's economic participation."
            );
        }

        if (combined.contains("job") || combined.contains("work") || combined.contains("employment") || combined.contains("vocational") || combined.contains("skill") || combined.contains("livelihood") || combined.contains("income")) {
            return new SdgSuggestionResponse(
                "SDG8", 
                Arrays.asList("8.3", "8.5"), 
                0.89, 
                "Supports sustainable economic growth, job creation, and entrepreneurship."
            );
        }

        if (combined.contains("tree") || combined.contains("forest") || combined.contains("climate") || combined.contains("carbon") || combined.contains("environment") || combined.contains("nature")) {
            return new SdgSuggestionResponse(
                "SDG13", 
                Arrays.asList("13.1", "13.2"), 
                0.92, 
                "Addresses environmental sustainability, climate action, and ecological conservation."
            );
        }

        // Default fallback suggestion
        return new SdgSuggestionResponse(
            "SDG1", 
            Arrays.asList("1.1", "1.2"), 
            0.75, 
            "General community development initiative aligned with poverty alleviation."
        );
    }
}
