package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.TicketReview;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TicketReviewRepository extends JpaRepository<TicketReview, UUID> {
    List<TicketReview> findByTicketIdOrderByReviewedAtAsc(UUID ticketId);
}
