package com.transparencychain.backend.service.ai;

import com.transparencychain.backend.service.OpenRouterAiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
public class AiFallbackChainService {

    private static final Logger log = LoggerFactory.getLogger(AiFallbackChainService.class);

    @Autowired(required = false)
    private OpenRouterAiService openRouterAiService;

    @Autowired(required = false)
    private SecondAiProvider secondAiProvider;

    public static class MilestoneGenerationResult {
        private String aiProviderUsed; // "OPENROUTER", "FALLBACK_PROVIDER", "TEMPLATE"
        private List<Map<String, Object>> milestones = new ArrayList<>();

        public MilestoneGenerationResult(String aiProviderUsed, List<Map<String, Object>> milestones) {
            this.aiProviderUsed = aiProviderUsed;
            this.milestones = milestones != null ? milestones : new ArrayList<>();
        }

        public String getAiProviderUsed() {
            return aiProviderUsed;
        }

        public List<Map<String, Object>> getMilestones() {
            return milestones;
        }
    }

    public MilestoneGenerationResult generateMilestonesWithFallback(
            String title, String description, BigDecimal totalBudget, String duration, String sdgGoal) {

        // Step 1: Try Primary Provider (OpenRouter Llama 3.3)
        if (openRouterAiService != null && openRouterAiService.isConfigured()) {
            try {
                log.info("[AI Chain Step 1] Calling Primary Provider (OpenRouter Llama 3.3)...");
                List<Map<String, Object>> primaryRes = openRouterAiService.generateCustomMilestones(
                        title, description, totalBudget, duration, sdgGoal
                );
                if (primaryRes != null && !primaryRes.isEmpty()) {
                    log.info("ai_provider_used: OPENROUTER (Successfully generated {} milestones)", primaryRes.size());
                    return new MilestoneGenerationResult("OPENROUTER", primaryRes);
                }
            } catch (Exception e) {
                log.warn("[AI Chain Step 1 Failure] OpenRouter call failed/timed out: {}", e.getMessage());
            }
        }

        // Step 2: Try Secondary Provider (SecondAiProvider / DeepSeek / Gemini)
        if (secondAiProvider != null && secondAiProvider.isAvailable()) {
            try {
                log.info("[AI Chain Step 2] Calling Fallback Provider ({})", secondAiProvider.getProviderName());
                List<Map<String, Object>> secondRes = secondAiProvider.generateCustomMilestones(
                        title, description, totalBudget, duration, sdgGoal
                );
                if (secondRes != null && !secondRes.isEmpty()) {
                    log.info("ai_provider_used: FALLBACK_PROVIDER (Successfully generated {} milestones)", secondRes.size());
                    return new MilestoneGenerationResult("FALLBACK_PROVIDER", secondRes);
                }
            } catch (Exception e) {
                log.warn("[AI Chain Step 2 Failure] Fallback AI provider failed: {}", e.getMessage());
            }
        }

        // Step 3: Fall back to deterministic template generator
        log.info("[AI Chain Step 3] Falling back to deterministic Template Generator");
        List<Map<String, Object>> templateMilestones = generateTemplateMilestones(title, totalBudget, duration);
        log.info("ai_provider_used: TEMPLATE (Generated default 3-phase template milestones)");
        return new MilestoneGenerationResult("TEMPLATE", templateMilestones);
    }

    private List<Map<String, Object>> generateTemplateMilestones(String title, BigDecimal totalBudget, String duration) {
        List<Map<String, Object>> result = new ArrayList<>();
        BigDecimal budget = totalBudget != null ? totalBudget : BigDecimal.ZERO;
        BigDecimal p1Budget = budget.multiply(new BigDecimal("0.30")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal p2Budget = budget.multiply(new BigDecimal("0.45")).setScale(2, RoundingMode.HALF_UP);
        BigDecimal p3Budget = budget.subtract(p1Budget).subtract(p2Budget).setScale(2, RoundingMode.HALF_UP);

        Map<String, Object> m1 = new HashMap<>();
        m1.put("sequenceNumber", 1);
        m1.put("title", "Phase 1: Initial Setup & Procurement");
        m1.put("description", "Mobilization of materials, site preparation, and initial vendor agreements.");
        m1.put("suggestedBudget", p1Budget);
        result.add(m1);

        Map<String, Object> m2 = new HashMap<>();
        m2.put("sequenceNumber", 2);
        m2.put("title", "Phase 2: Core Execution & Implementation");
        m2.put("description", "Primary field deployment, construction/assembly, and ongoing site inspection.");
        m2.put("suggestedBudget", p2Budget);
        result.add(m2);

        Map<String, Object> m3 = new HashMap<>();
        m3.put("sequenceNumber", 3);
        m3.put("title", "Phase 3: Final Verification & Handover");
        m3.put("description", "Quality audit, beneficiary feedback collection, and final completion reporting.");
        m3.put("suggestedBudget", p3Budget);
        result.add(m3);

        return result;
    }
}
