package com.transparencychain.backend;

import com.transparencychain.backend.service.OpenRouterAiService;
import com.transparencychain.backend.service.ai.AiFallbackChainService;
import com.transparencychain.backend.service.ai.SecondAiProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

public class AiFallbackChainServiceTest {

    @Test
    @DisplayName("Test 1: Primary provider succeeds -> ai_provider_used: OPENROUTER")
    public void testPrimaryProviderSuccess() {
        OpenRouterAiService primaryMock = Mockito.mock(OpenRouterAiService.class);
        when(primaryMock.isConfigured()).thenReturn(true);

        List<Map<String, Object>> mockMs = new ArrayList<>();
        Map<String, Object> m1 = new HashMap<>();
        m1.put("sequenceNumber", 1);
        m1.put("title", "Phase 1: Solar Panel Assessment");
        m1.put("suggestedBudget", new BigDecimal("50000"));
        mockMs.add(m1);

        when(primaryMock.generateCustomMilestones(any(), any(), any(), any(), any())).thenReturn(mockMs);

        SecondAiProvider secondMock = Mockito.mock(SecondAiProvider.class);

        AiFallbackChainService service = new AiFallbackChainService();
        injectField(service, "openRouterAiService", primaryMock);
        injectField(service, "secondAiProvider", secondMock);

        AiFallbackChainService.MilestoneGenerationResult result = service.generateMilestonesWithFallback(
                "Solar Water Well", "Clean energy well", new BigDecimal("100000"), "6 months", "SDG7"
        );

        assertEquals("OPENROUTER", result.getAiProviderUsed());
        assertFalse(result.getMilestones().isEmpty());
    }

    @Test
    @DisplayName("Test 2: Primary provider fails, Fallback provider succeeds -> ai_provider_used: FALLBACK_PROVIDER")
    public void testPrimaryFailsFallbackSucceeds() {
        OpenRouterAiService primaryMock = Mockito.mock(OpenRouterAiService.class);
        when(primaryMock.isConfigured()).thenReturn(true);
        when(primaryMock.generateCustomMilestones(any(), any(), any(), any(), any())).thenThrow(new RuntimeException("401 Unauthorized / Rate Limit Exceeded"));

        SecondAiProvider secondMock = Mockito.mock(SecondAiProvider.class);
        when(secondMock.isAvailable()).thenReturn(true);

        List<Map<String, Object>> fallbackMs = new ArrayList<>();
        Map<String, Object> fm1 = new HashMap<>();
        fm1.put("sequenceNumber", 1);
        fm1.put("title", "Phase 1: Fallback Construction Phase");
        fm1.put("suggestedBudget", new BigDecimal("40000"));
        fallbackMs.add(fm1);

        when(secondMock.generateCustomMilestones(any(), any(), any(), any(), any())).thenReturn(fallbackMs);

        AiFallbackChainService service = new AiFallbackChainService();
        injectField(service, "openRouterAiService", primaryMock);
        injectField(service, "secondAiProvider", secondMock);

        AiFallbackChainService.MilestoneGenerationResult result = service.generateMilestonesWithFallback(
                "School Repair", "Fixing classrooms", new BigDecimal("100000"), "3 months", "SDG4"
        );

        assertEquals("FALLBACK_PROVIDER", result.getAiProviderUsed());
        assertEquals(1, result.getMilestones().size());
    }

    @Test
    @DisplayName("Test 3: Both AI providers fail -> Template fallback succeeds -> ai_provider_used: TEMPLATE")
    public void testBothFailTemplateSucceeds() {
        OpenRouterAiService primaryMock = Mockito.mock(OpenRouterAiService.class);
        when(primaryMock.isConfigured()).thenReturn(true);
        when(primaryMock.generateCustomMilestones(any(), any(), any(), any(), any())).thenThrow(new RuntimeException("Connection Timeout"));

        SecondAiProvider secondMock = Mockito.mock(SecondAiProvider.class);
        when(secondMock.isAvailable()).thenReturn(true);
        when(secondMock.generateCustomMilestones(any(), any(), any(), any(), any())).thenThrow(new RuntimeException("Provider Offline"));

        AiFallbackChainService service = new AiFallbackChainService();
        injectField(service, "openRouterAiService", primaryMock);
        injectField(service, "secondAiProvider", secondMock);

        AiFallbackChainService.MilestoneGenerationResult result = service.generateMilestonesWithFallback(
                "Health Clinic", "Primary care unit", new BigDecimal("200000"), "12 months", "SDG3"
        );

        assertEquals("TEMPLATE", result.getAiProviderUsed());
        assertEquals(3, result.getMilestones().size());
        assertEquals("Phase 1: Initial Setup & Procurement", result.getMilestones().get(0).get("title"));
    }

    private void injectField(Object target, String fieldName, Object value) {
        try {
            java.lang.reflect.Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
