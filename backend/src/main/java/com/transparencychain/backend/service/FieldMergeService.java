package com.transparencychain.backend.service;

import com.transparencychain.backend.model.ExtractedField;
import com.transparencychain.backend.repository.ExtractedFieldRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;

@Service
public class FieldMergeService {

    @Autowired
    private ExtractedFieldRepository extractedFieldRepository;

    public void mergeAndSaveFields(UUID draftId, Map<String, List<OcrExtractionService.OcrResult>> allResults) {
        Map<String, ExtractedField> mergedMap = new HashMap<>();

        for (Map.Entry<String, List<OcrExtractionService.OcrResult>> docEntry : allResults.entrySet()) {
            String docType = docEntry.getKey();
            for (OcrExtractionService.OcrResult result : docEntry.getValue()) {
                
                String fieldKey = result.fieldName;
                
                if (!mergedMap.containsKey(fieldKey)) {
                    ExtractedField field = new ExtractedField();
                    field.setDraftId(draftId);
                    field.setFieldName(fieldKey);
                    field.setExtractedValue(result.value);
                    field.setConfidenceScore(result.confidence);
                    field.setSourceDocumentType(docType);
                    field.setHasConflict(false);
                    mergedMap.put(fieldKey, field);
                } else {
                    ExtractedField existingField = mergedMap.get(fieldKey);
                    
                    // Normalization for comparison (e.g., removing spaces and lowering case)
                    String normalizedExisting = existingField.getExtractedValue().toLowerCase().replaceAll("[^a-z0-9]", "");
                    String normalizedNew = result.value.toLowerCase().replaceAll("[^a-z0-9]", "");
                    
                    if (normalizedExisting.equals(normalizedNew)) {
                        // Match! Boost confidence to the max of the two
                        if (result.confidence.compareTo(existingField.getConfidenceScore()) > 0) {
                            existingField.setConfidenceScore(result.confidence);
                            existingField.setExtractedValue(result.value); // Use the higher confidence raw string
                            existingField.setSourceDocumentType(existingField.getSourceDocumentType() + ", " + docType);
                        }
                    } else {
                        // CONFLICT!
                        existingField.setHasConflict(true);
                        existingField.setConfidenceScore(BigDecimal.ZERO);
                        existingField.setSourceDocumentType(existingField.getSourceDocumentType() + ", " + docType);
                        // Store both values in the extractedValue so the user can see it in UI, e.g. "Value1 | Value2"
                        existingField.setExtractedValue(existingField.getExtractedValue() + " | " + result.value);
                    }
                }
            }
        }

        // Save all merged fields to DB
        extractedFieldRepository.saveAll(mergedMap.values());
    }
}
