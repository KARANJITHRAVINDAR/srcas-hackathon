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
}
