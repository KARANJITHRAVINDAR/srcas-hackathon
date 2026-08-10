package com.transparencychain.backend.service;

import com.transparencychain.backend.model.NgoProfile;
import com.transparencychain.backend.repository.NgoProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class TrustScoreService {
    @Autowired
    private NgoProfileRepository ngoRepository;

    public Map<String, Object> getTrustScoreBreakdown(UUID ngoId) {
        NgoProfile ngo = ngoRepository.findById(ngoId)
                .orElseThrow(() -> new RuntimeException("NGO not found"));
        
        Map<String, Object> breakdown = new HashMap<>();
        breakdown.put("score", ngo.getTrustScore());
        
        // Mock values for breakdown based on prompt criteria
        breakdown.put("registrationAgeScore", 15);
        breakdown.put("documentCompletenessScore", 20);
        breakdown.put("pastProjectsCompletedOnTimeScore", 25);
        breakdown.put("averageFraudScoreAcrossPastBillsScore", 25);
        breakdown.put("beneficiaryConfirmationRateScore", 15);
        
        return breakdown;
    }

    public void recalculate(UUID ngoId) {
        NgoProfile ngo = ngoRepository.findById(ngoId)
                .orElseThrow(() -> new RuntimeException("NGO not found"));
        
        // Dummy logic for calculating trust score
        BigDecimal score = new BigDecimal("85.50"); // initial mock score
        
        ngo.setTrustScore(score);
        ngoRepository.save(ngo);
    }
}
