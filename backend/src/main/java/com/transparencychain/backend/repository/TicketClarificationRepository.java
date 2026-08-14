package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.TicketClarification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketClarificationRepository extends JpaRepository<TicketClarification, UUID> {
    List<TicketClarification> findByTicketIdOrderByQueryCreatedAtAsc(UUID ticketId);
    
    Optional<TicketClarification> findFirstByTicketIdAndStatusOrderByQueryCreatedAtDesc(
            UUID ticketId, 
            TicketClarification.ClarificationStatus status
    );

    List<TicketClarification> findByTicket_Milestone_IdOrderByQueryCreatedAtDesc(UUID milestoneId);
}
