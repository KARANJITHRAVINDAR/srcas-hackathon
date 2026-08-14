package com.transparencychain.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ngo_registration_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NgoRegistrationDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "submission_id", nullable = false)
    private UUID submissionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false)
    private DocumentType documentType;

    @Column(name = "file_reference", nullable = false, length = 500)
    private String fileReference;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "is_mandatory_for_this_submission", nullable = false)
    private Boolean isMandatoryForThisSubmission = true;

    @CreationTimestamp
    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;

    public enum DocumentType {
        LEGAL_REGISTRATION,
        PAN,
        CONSTITUTION,
        ADDRESS_PROOF,
        GOVERNING_BODY,
        BANK_ACCOUNT,
        DARPAN
    }
}
