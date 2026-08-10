package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.FunderProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface FunderProfileRepository extends JpaRepository<FunderProfile, UUID> {
    Optional<FunderProfile> findByUserId(UUID userId);
}
