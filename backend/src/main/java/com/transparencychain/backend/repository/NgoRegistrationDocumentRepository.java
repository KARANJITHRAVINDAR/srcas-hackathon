package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.NgoRegistrationDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface NgoRegistrationDocumentRepository extends JpaRepository<NgoRegistrationDocument, UUID> {
    List<NgoRegistrationDocument> findBySubmissionId(UUID submissionId);
}
