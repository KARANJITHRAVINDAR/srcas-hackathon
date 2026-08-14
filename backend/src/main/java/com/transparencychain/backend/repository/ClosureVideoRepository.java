package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.ClosureVideo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ClosureVideoRepository extends JpaRepository<ClosureVideo, UUID> {
    List<ClosureVideo> findByProjectIdOrderByUploadedAtDesc(UUID projectId);
    Optional<ClosureVideo> findFirstByProjectIdOrderByUploadedAtDesc(UUID projectId);
}
