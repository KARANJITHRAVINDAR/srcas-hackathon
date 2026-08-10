package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.NgoProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface NgoProfileRepository extends JpaRepository<NgoProfile, UUID> {
    Optional<NgoProfile> findByUserId(UUID userId);
}
