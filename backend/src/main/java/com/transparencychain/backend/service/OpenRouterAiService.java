package com.transparencychain.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.*;

/**
 * OpenRouter AI Service for intelligent Document Understanding,
 * Semantic Entity Resolution, and NGO Packet Fraud Verification.
 */
@Service
public class OpenRouterAiService {

    private static final Logger log = LoggerFactory.getLogger(OpenRouterAiService.class);

    @Value("${openrouter.api.key:${OPENROUTER_API_KEY:}}")
    private String openRouterApiKey;

    @Value("${openrouter.api.model:${OPENROUTER_MODEL:meta-llama/llama-3.3-70b-instruct}}")
    private String modelName = "meta-llama/llama-3.3-70b-instruct";

    private final String OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OpenRouterAiService() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(8000);
        factory.setReadTimeout(10000);
        this.restTemplate = new RestTemplate(factory);
    }

    public String getEffectiveApiKey() {
        if (openRouterApiKey != null && !openRouterApiKey.trim().isBlank()) {
            return openRouterApiKey.trim();
        }
        String envKey = System.getenv("OPENROUTER_API_KEY");
        return envKey != null ? envKey.trim() : "";
    }

    public boolean isConfigured() {
        String key = getEffectiveApiKey();
        return key != null && !key.isBlank();
    }

    public JsonNode callLlamaModel(String prompt) {
        if (!isConfigured()) {
            log.warn("[OpenRouter AI] API Key not configured.");
            return null;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + getEffectiveApiKey());
            headers.set("HTTP-Referer", "http://localhost:8081");
            headers.set("X-Title", "Transparency Chain");

            Map<String, Object> message = new HashMap<>();
            message.put("role", "user");
            message.put("content", prompt);

            Map<String, Object> body = new HashMap<>();
            body.put("model", modelName);
            body.put("messages", Collections.singletonList(message));
            body.put("temperature", 0.1);

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
            log.warn("[OpenRouter AI] API call error: {}", e.getMessage());
        }
        return null;
    }

    /**
     * AI-Powered Semantic Document Field Extraction.
     * Uses LLM to extract fields from Indian NGO legal documents without rigid regex rules.
     */
    public Map<String, String> extractDocumentFieldsWithAi(String text, String documentType) {
        if (!isConfigured() || text == null || text.isBlank()) {
            return null;
        }

        String prompt = String.format(
            "You are an expert Indian NGO Document Verification AI. Extract all official legal fields from this %s document text.\n" +
            "Source Document Text:\n\"\"\"\n%s\n\"\"\"\n\n" +
            "Extract the following fields accurately:\n" +
            "- orgName: The exact official name of the NGO/Trust/Society. (On PAN cards, read the actual entity name, ignore income tax headers, watermarks, dates, or field labels).\n" +
            "- panNumber: The 10-character alphanumeric PAN (e.g. AAATC9843M).\n" +
            "- registrationNumber: The registration number, URN, or approval number (e.g. AAATC9843ME20219, AAATC9843M23CH01, 7846, TN/2017/0150250).\n" +
            "- registrationDate: The registration, execution, or order date.\n" +
            "- registeringAuthority: The issuing officer or department (e.g. CIT (Exemption), Sub-Registrar, Charity Commissioner).\n" +
            "- registeredAddress: The full registered office address including 6-digit pin code.\n" +
            "- registrationType: Trust, Society, or Section 8 Company.\n" +
            "- trusteeDetails: Names and designations of trustees or office bearers.\n" +
            "- authorizedSignatoryName: Name of managing trustee or authorized signatory.\n" +
            "- darpanId: NGO Darpan ID if present.\n\n" +
            "Return ONLY a JSON object with these keys (null for fields not present in document):\n" +
            "{\n" +
            "  \"orgName\": \"...\",\n" +
            "  \"panNumber\": \"...\",\n" +
            "  \"registrationNumber\": \"...\",\n" +
            "  \"registrationDate\": \"...\",\n" +
            "  \"registeringAuthority\": \"...\",\n" +
            "  \"registeredAddress\": \"...\",\n" +
            "  \"registrationType\": \"...\",\n" +
            "  \"trusteeDetails\": \"...\",\n" +
            "  \"authorizedSignatoryName\": \"...\",\n" +
            "  \"darpanId\": \"...\"\n" +
            "}",
            documentType,
            text.length() > 3000 ? text.substring(0, 3000) : text
        );

        JsonNode res = callLlamaModel(prompt);
        if (res != null) {
            Map<String, String> fields = new HashMap<>();
            res.fieldNames().forEachRemaining(key -> {
                JsonNode val = res.get(key);
                if (val != null && !val.isNull() && !val.asText().isBlank() && !val.asText().equalsIgnoreCase("null")) {
                    fields.put(key, val.asText().trim());
                }
            });
            if (!fields.isEmpty()) {
                log.info("[OpenRouter AI] Successfully extracted {} fields for docType={}", fields.size(), documentType);
                return fields;
            }
        }
        return null;
    }

    /**
     * AI-Powered Cross-Document Fraud Verification and Identity Convergence.
     */
    public static class AiVerificationReport {
        public boolean isConverged;
        public double consistencyScore;
        public double authenticityScore;
        public String canonicalOrgName;
        public List<String> discrepancies = new ArrayList<>();
    }

    public AiVerificationReport verifyPacketWithAi(List<Map<String, Object>> documents) {
        if (!isConfigured() || documents == null || documents.isEmpty()) {
            return null;
        }

        try {
            String jsonInput = objectMapper.writeValueAsString(documents);
            String prompt = String.format(
                "You are an expert Indian NGO Document Fraud & Identity Verification Auditor. Analyze this collection of extracted documents uploaded by an applicant:\n" +
                "%s\n\n" +
                "Evaluate:\n" +
                "1. Semantic Entity Convergence: Do all uploaded documents prove the legal identity of the SAME organization (e.g. 'CARE INDIA FOUNDATION', 'Care India Foundation', 'CAREINDIAFOUNDATION' are stylistic variants of the SAME entity)?\n" +
                "2. Fraud Detection: Are any documents forged, fabricated, or belonging to completely distinct, unrelated organizations (e.g. 'Apex Healthcare Mission' mixed with 'Shree Ganesh Trust')?\n" +
                "3. Geographic and Financial Validity: Are the addresses and PAN numbers consistent with each other?\n\n" +
                "Scoring Criteria:\n" +
                "- If genuine and consistent: isConverged = true, consistencyScore = 35.0, authenticityScore = 20.0.\n" +
                "- If multi-entity forgery or major divergence detected: isConverged = false, consistencyScore = 0.0, authenticityScore = 4.0, provide detailed discrepancy reasons.\n\n" +
                "Return ONLY a JSON object:\n" +
                "{\n" +
                "  \"isConverged\": true,\n" +
                "  \"consistencyScore\": 35.0,\n" +
                "  \"authenticityScore\": 20.0,\n" +
                "  \"canonicalOrgName\": \"CARE INDIA FOUNDATION\",\n" +
                "  \"discrepancies\": []\n" +
                "}",
                jsonInput
            );

            JsonNode res = callLlamaModel(prompt);
            if (res != null && res.has("isConverged")) {
                AiVerificationReport report = new AiVerificationReport();
                report.isConverged = res.get("isConverged").asBoolean();
                report.consistencyScore = res.has("consistencyScore") ? res.get("consistencyScore").asDouble() : (report.isConverged ? 35.0 : 0.0);
                report.authenticityScore = res.has("authenticityScore") ? res.get("authenticityScore").asDouble() : (report.isConverged ? 20.0 : 4.0);
                report.canonicalOrgName = res.has("canonicalOrgName") ? res.get("canonicalOrgName").asText() : "";
                if (res.has("discrepancies") && res.get("discrepancies").isArray()) {
                    res.get("discrepancies").forEach(d -> report.discrepancies.add(d.asText()));
                }
                return report;
            }
        } catch (Exception e) {
            log.warn("[OpenRouter AI] Packet verification error: {}", e.getMessage());
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
