package com.transparencychain.backend.service.ai;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public interface AiTextGenerationProvider {
    String getProviderName();
    boolean isAvailable();
    List<Map<String, Object>> generateCustomMilestones(String title, String description, BigDecimal totalBudget, String duration, String sdgGoal);
}
