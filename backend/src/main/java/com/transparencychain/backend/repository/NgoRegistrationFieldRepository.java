package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.NgoRegistrationField;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NgoRegistrationFieldRepository extends JpaRepository<NgoRegistrationField, UUID> {
    List<NgoRegistrationField> findBySubmissionId(UUID submissionId);
    Optional<NgoRegistrationField> findBySubmissionIdAndFieldName(UUID submissionId, String fieldName);
    void deleteBySubmissionId(UUID submissionId);
}
