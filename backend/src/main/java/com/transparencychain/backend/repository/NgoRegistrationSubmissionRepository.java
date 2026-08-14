package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.NgoRegistrationSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface NgoRegistrationSubmissionRepository extends JpaRepository<NgoRegistrationSubmission, UUID> {
    List<NgoRegistrationSubmission> findByNgoApplicantIdOrderBySubmittedAtDesc(UUID ngoApplicantId);
    Optional<NgoRegistrationSubmission> findTopByNgoApplicantIdOrderBySubmittedAtDesc(UUID ngoApplicantId);
}
