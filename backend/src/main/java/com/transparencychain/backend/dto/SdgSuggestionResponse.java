package com.transparencychain.backend.dto;

import java.util.List;

public class SdgSuggestionResponse {
    private String sdgGoal;
    private List<String> sdgTargets;
    private double confidence;
    private String reasoning;

    public SdgSuggestionResponse() {}

    public SdgSuggestionResponse(String sdgGoal, List<String> sdgTargets, double confidence, String reasoning) {
        this.sdgGoal = sdgGoal;
        this.sdgTargets = sdgTargets;
        this.confidence = confidence;
        this.reasoning = reasoning;
    }

    public String getSdgGoal() {
        return sdgGoal;
    }

    public void setSdgGoal(String sdgGoal) {
        this.sdgGoal = sdgGoal;
    }

    public List<String> getSdgTargets() {
        return sdgTargets;
    }

    public void setSdgTargets(List<String> sdgTargets) {
        this.sdgTargets = sdgTargets;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public String getReasoning() {
        return reasoning;
    }

    public void setReasoning(String reasoning) {
        this.reasoning = reasoning;
    }
}
