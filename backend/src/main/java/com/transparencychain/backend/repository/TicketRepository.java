package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {

    List<Ticket> findByStatus(Ticket.TicketStatus status);

    @Query("SELECT t FROM Ticket t WHERE t.milestone.project.id = :projectId")
    List<Ticket> findByProjectId(@Param("projectId") UUID projectId);

    List<Ticket> findByMilestoneId(UUID milestoneId);

    java.util.Optional<Ticket> findByEvidenceId(UUID evidenceId);

    @Query("SELECT COUNT(t) FROM Ticket t WHERE t.milestone.project.id IN (SELECT e.project.id FROM OrgProjectEngagement e WHERE e.funder.id = :funderId) AND (t.status = 'OPEN' OR t.status = 'UNDER_ORG_REVIEW')")
    long countOpenTicketsForFunder(@Param("funderId") UUID funderId);
}
