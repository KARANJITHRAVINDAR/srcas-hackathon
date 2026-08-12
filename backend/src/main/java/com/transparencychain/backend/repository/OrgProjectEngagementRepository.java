package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.OrgProjectEngagement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrgProjectEngagementRepository extends JpaRepository<OrgProjectEngagement, UUID> {

    Optional<OrgProjectEngagement> findByFunderIdAndProjectId(UUID funderId, UUID projectId);

    List<OrgProjectEngagement> findByFunderId(UUID funderId);

    List<OrgProjectEngagement> findByFunderIdAndStatus(UUID funderId, OrgProjectEngagement.EngagementStatus status);

    List<OrgProjectEngagement> findByProjectId(UUID projectId);
}
