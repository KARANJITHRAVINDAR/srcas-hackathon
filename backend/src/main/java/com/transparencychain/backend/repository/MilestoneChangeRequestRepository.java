package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.MilestoneChangeRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MilestoneChangeRequestRepository extends JpaRepository<MilestoneChangeRequest, UUID> {

    /** All CRs for a specific milestone (for diff history display). */
    List<MilestoneChangeRequest> findByMilestoneIdOrderByCreatedAtAsc(UUID milestoneId);

    /** All CRs raised by a given org — for the org's own negotiation inbox. */
    List<MilestoneChangeRequest> findByRequestedByOrgIdAndStatus(
            UUID orgId, MilestoneChangeRequest.ChangeRequestStatus status);

    /** All CRs raised by a given NGO — for the NGO's own outbound negotiation tracking. */
    List<MilestoneChangeRequest> findByRequestedByNgoIdAndStatus(
            UUID ngoId, MilestoneChangeRequest.ChangeRequestStatus status);

    /** All CRs on milestones of a given project — for the NGO's pending inbox. */
    List<MilestoneChangeRequest> findByMilestone_Project_IdAndStatus(
            UUID projectId, MilestoneChangeRequest.ChangeRequestStatus status);

    /** Check whether a PENDING CR already exists for a given milestone (prevents duplicates). */
    boolean existsByMilestoneIdAndStatus(
            UUID milestoneId, MilestoneChangeRequest.ChangeRequestStatus status);
}
