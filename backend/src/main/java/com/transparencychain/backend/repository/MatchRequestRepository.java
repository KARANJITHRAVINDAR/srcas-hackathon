package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.MatchRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface MatchRequestRepository extends JpaRepository<MatchRequest, UUID> {
    List<MatchRequest> findByNeedNgoId(UUID ngoId);
}
