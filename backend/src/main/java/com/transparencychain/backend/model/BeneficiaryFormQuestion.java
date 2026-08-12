package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.UUID;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Data
@Entity
@Table(name = "beneficiary_form_questions")
public class BeneficiaryFormQuestion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_id", nullable = false)
    @JsonIgnore
    private BeneficiaryVerificationForm form;

    private String questionText;

    @Enumerated(EnumType.STRING)
    private QuestionType questionType;

    private boolean isRequired;
    private int displayOrder;

    public enum QuestionType {
        YES_NO, RATING, SHORT_TEXT
    }
}
