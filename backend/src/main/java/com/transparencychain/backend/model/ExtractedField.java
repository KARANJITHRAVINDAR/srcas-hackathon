package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Data
@Entity
@Table(name = "extracted_fields")
public class ExtractedField {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @Column(name = "draft_id", nullable = false)
    private UUID draftId;
    
    @Column(name = "field_name", nullable = false)
    private String fieldName;
    
    @Column(name = "extracted_value")
    private String extractedValue;
    
    @Column(name = "confidence_score", precision = 5, scale = 2)
    private BigDecimal confidenceScore;
    
    @Column(name = "source_document_type")
    private String sourceDocumentType;
    
    @Column(name = "has_conflict")
    private boolean hasConflict = false;
    
    @Column(name = "resolved_value")
    private String resolvedValue;
    
    @Column(name = "resolved_by")
    private String resolvedBy;
}
