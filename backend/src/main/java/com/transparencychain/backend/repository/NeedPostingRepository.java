package com.transparencychain.backend.repository;

import com.transparencychain.backend.model.NeedPosting;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface NeedPostingRepository extends JpaRepository<NeedPosting, UUID> {
}
