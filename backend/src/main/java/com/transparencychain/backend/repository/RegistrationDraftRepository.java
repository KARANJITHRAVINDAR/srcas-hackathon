package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.RegistrationDraft;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface RegistrationDraftRepository extends JpaRepository<RegistrationDraft, UUID> {
    Optional<RegistrationDraft> findByUserId(UUID userId);
}
