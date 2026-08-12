package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.MilestoneVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MilestoneVersionRepository extends JpaRepository<MilestoneVersion, UUID> {

    List<MilestoneVersion> findByMilestoneIdOrderByVersionNumberAsc(UUID milestoneId);

    /** Latest version number for a milestone — used to auto-increment when creating a new version. */
    java.util.Optional<MilestoneVersion> findTopByMilestoneIdOrderByVersionNumberDesc(UUID milestoneId);
}
